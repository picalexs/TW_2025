const petModel = require("../models/petModel");
const { sendResponse, collectRequestData } = require("../utils/helpers");
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs').promises;

class PetController {
  async getAllPets(req, res) {
    try {
      const pets = await petModel.getAll();
      sendResponse(res, 200, pets);
    } catch (error) {
      console.error("Error getting all pets:", error);
      sendResponse(res, 500, { error: "Failed to fetch pets", message: error.message });
    }
  }

  async getPetById(req, res, id) {
    try {
      const pet = await petModel.getById(id);
      if (pet) {
        sendResponse(res, 200, pet);
      } else {
        sendResponse(res, 404, { error: "Pet not found" });
      }
    } catch (error) {
      console.error(`Error getting pet by ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to fetch pet", message: error.message });
    }
  }

  async getPetTags(req, res, id) {
    try {
      const tags = await petModel.getPetTags(id);
      sendResponse(res, 200, { tags });
    } catch (error) {
      console.error(`Error getting pet tags for ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to fetch pet tags", message: error.message });
    }
  }

  async createPet(req, res) {
    try {
      const contentType = req.headers['content-type'];

      if (!contentType || !contentType.includes('multipart/form-data')) {
        return sendResponse(res, 400, { error: "Content-Type must be multipart/form-data" });
      }

      const fields = {};
      const files = [];

      const busboy = Busboy({ headers: req.headers });

      busboy.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });

      busboy.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;

        // Validate file type
        if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
          file.resume(); // Consume the stream
          return;
        }

        const chunks = [];
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });

        file.on('end', () => {
          files.push({
            fieldname,
            originalname: filename,
            buffer: Buffer.concat(chunks),
            mimetype: mimeType,
            size: Buffer.concat(chunks).length
          });
        });
      });

      busboy.on('finish', async () => {
        try {
          if (req.user && req.user.id) {
            fields.shelterId = req.user.id;
            fields.userId = req.user.id;
          }

          const validatedData = petModel.validatePetCreationData(fields, files);

          const petId = await petModel.createPet(validatedData.petData);
          let mediaPaths = [];
          if (files && files.length > 0) {
            mediaPaths = await this.saveMediaFiles(files, petId, validatedData.profileImageIndex);
            await petModel.saveMediaPaths(petId, mediaPaths);
          }

          if (validatedData.tags.length > 0) {
            const processedTagIds = await petModel.processAndCreateTags(validatedData.tags);
            if (processedTagIds.length > 0) {
              await petModel.saveTags(petId, processedTagIds);
            }
          }

          if (validatedData.medicalHistory.length > 0) {
            await petModel.saveMedicalHistory(petId, validatedData.medicalHistory);
          }

          if (validatedData.careResources.length > 0) {
            await petModel.saveCareResources(petId, validatedData.careResources);
          }

          if (validatedData.careSchedule.length > 0) {
            await petModel.saveCareSchedule(petId, validatedData.careSchedule);
          }

          sendResponse(res, 201, {
            id: petId,
            message: "Pet created successfully",
            mediaPaths: mediaPaths
          });

        } catch (error) {
          console.error("Error creating pet:", error);
          sendResponse(res, 400, { error: "Failed to create pet", message: error.message });
        }
      });

      busboy.on('error', (error) => {
        console.error("Busboy parsing error:", error);
        sendResponse(res, 400, { error: "Failed to parse form data", message: error.message });
      });

      req.pipe(busboy);

    } catch (error) {
      console.error("Error creating pet:", error);
      sendResponse(res, 400, { error: "Failed to create pet", message: error.message });
    }
  }

  async saveMediaFiles(files, petId, profileImageIndex = 0) {
    const ImageProcessor = require('../utils/imageProcessor');
    const mediaDir = path.join(__dirname, '../../server/animal', petId.toString());

    try {
      await fs.mkdir(mediaDir, { recursive: true });
    } catch (error) {
      console.error("Error creating directory:", error);
      throw new Error("Failed to create media directory");
    }

    const mediaPaths = [];
    const fileProcessingPromises = files.map(async (file, i) => {
      const isProfile = i === profileImageIndex;
      
      let filename;
      if (isProfile) {
        filename = 'profile';
      } else {
        const fileNumber = i < profileImageIndex ? i + 1 : i;
        filename = `${fileNumber}`;
      }

      const outputPath = path.join(mediaDir, filename);

      try {
        const processPromise = ImageProcessor.processAndSaveFile(file, outputPath, {
          type: isProfile ? 'profilePicture' : 'petMedia'
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Image processing timeout')), 30000);
        });

        const result = await Promise.race([processPromise, timeoutPromise]);

        const relativePath = `/server/animal/${petId}/${path.basename(result.path)}`;

        return {
          success: true,
          data: {
            type: file.mimetype.startsWith('image') ? 'image' : 'video',
            path: relativePath,
            isProfile: isProfile,
            originalSize: result.originalSize,
            processedSize: result.processedSize,
            processed: result.processed
          }
        };

      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        
        const ext = path.extname(file.originalname) || (file.mimetype.includes('image') ? '.jpg' : '.mp4');
        const fallbackPath = path.join(mediaDir, `${filename}${ext}`);
        
        try {
          await fs.writeFile(fallbackPath, file.buffer);
          const relativePath = `/server/animal/${petId}/${filename}${ext}`;
          
          return {
            success: true,
            data: {
              type: file.mimetype.startsWith('image') ? 'image' : 'video',
              path: relativePath,
              isProfile: isProfile,
              processed: false,
              error: error.message
            }
          };
          
        } catch (fallbackError) {
          console.error(`Failed to save even original file:`, fallbackError);
          return {
            success: false,
            error: `Failed to save file ${filename}: ${fallbackError.message}`
          };
        }
      }
    });

    const results = await Promise.allSettled(fileProcessingPromises);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      if (result.status === 'fulfilled' && result.value.success) {
        mediaPaths.push(result.value.data);
        console.log(`Saved ${result.value.data.isProfile ? 'profile' : 'media'} file: ${files[i].originalname} -> ${result.value.data.path}`);
      } else {
        const errorMsg = result.status === 'fulfilled' ? result.value.error : result.reason?.message || 'Unknown error';
        console.error(`Failed to process file ${files[i].originalname}:`, errorMsg);
      }
    }

    if (mediaPaths.length === 0) {
      throw new Error("Failed to save any media files");
    }

    return mediaPaths;
  }

  async updatePet(req, res, id) {
    try {
      const contentType = req.headers['content-type'];

      if (contentType && contentType.includes('multipart/form-data')) {
        const fields = {};
        const files = [];
        const busboy = Busboy({ headers: req.headers });
        busboy.on('field', (fieldname, val) => {
          fields[fieldname] = val;
        });
        busboy.on('file', (fieldname, file, info) => {
          const { filename, encoding, mimeType } = info;
          if (!filename) {
            file.resume();
            return;
          }

          const chunks = [];
          file.on('data', chunk => chunks.push(chunk));
          file.on('end', () => {
            files.push({
              fieldname,
              filename,
              encoding,
              mimeType,
              buffer: Buffer.concat(chunks)
            });
          });
        });
        busboy.on('finish', async () => {
          try {
            const result = await petModel.updatePet(id, fields, files);
            if (!result) {
              return sendResponse(res, 404, { error: "Pet not found for update" });
            }

            if (result.pet && result.files) {
              if (result.files && result.files.length > 0) {
                const mediaPaths = await this.saveMediaFiles(result.files, id, result.profileImageIndex);
                await petModel.saveMediaPaths(id, mediaPaths);
              }

              if (result.tags && result.tags.length > 0) {
                const processedTagIds = await petModel.processAndCreateTags(result.tags);
                if (processedTagIds.length > 0) {
                  await petModel.clearPetTags(id);
                  await petModel.saveTags(id, processedTagIds);
                }
              }

              if (result.medicalHistory && result.medicalHistory.length > 0) {
                await petModel.clearMedicalHistory(id);
                await petModel.saveMedicalHistory(id, result.medicalHistory);
              }

              if (result.careResources && result.careResources.length > 0) {
                await petModel.clearCareResources(id);
                await petModel.saveCareResources(id, result.careResources);
              }

              if (result.careSchedule && result.careSchedule.length > 0) {
                await petModel.clearCareSchedule(id);
                await petModel.saveCareSchedule(id, result.careSchedule);
              }

              sendResponse(res, 200, result.pet);
            } else {
              sendResponse(res, 200, result);
            }
          } catch (error) {
            console.error('Error updating pet:', error);
            sendResponse(res, 500, { error: 'Failed to update pet', message: error.message });
          }
        });

        req.pipe(busboy);
      } else {
        const petData = await collectRequestData(req);
        const updatedPet = await petModel.updatePet(id, petData);
        if (updatedPet) {
          sendResponse(res, 200, updatedPet);
        } else {
          sendResponse(res, 404, { error: "Pet not found for update" });
        }
      }
    } catch (error) {
      console.error('Error in updatePet:', error);
      sendResponse(res, 500, { error: 'Internal server error', message: error.message });
    }
  }

  async deletePet(req, res, id) {
    try {
      const deleted = await petModel.delete(id);
      if (deleted) {
        sendResponse(res, 204, {});
      } else {
        sendResponse(res, 404, { error: "Pet not found for deletion" });
      }
    } catch (error) {
      console.error(`Error deleting pet with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to delete pet", message: error.message });
    }
  }

  async getPetsByShelter(req, res, shelterId) {
    try {
      const pets = await petModel.getByShelter(shelterId);
      sendResponse(res, 200, pets);
    } catch (error) {
      console.error(`Error getting pets by shelter ID ${shelterId}:`, error);
      sendResponse(res, 500, { error: "Failed to fetch pets by shelter", message: error.message });
    }
  }


  async getPetsFeed(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const searchParams = url.searchParams;

      const type = searchParams.get('type') || 'recent';
      const zone = searchParams.get('zone');
      const breed = searchParams.get('breed');
      const species = searchParams.get('species');
      const limit = parseInt(searchParams.get('limit')) || 20;
      const format = searchParams.get('format') || 'json';

      // For demo purposes, create some sample pets if no database is available
      const demoPets = [
        {
          id: 1,
          name: 'Bella',
          species: 'Dog',
          breed: 'Golden Retriever',
          age: '3 years',
          gender: 'Female',
          description: 'Friendly and energetic dog looking for an active family. Loves playing fetch and swimming.',
          city: 'New York',
          adoption_fee: 200,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Max',
          species: 'Cat',
          breed: 'Maine Coon',
          age: '2 years',
          gender: 'Male',
          description: 'Gentle giant cat who loves cuddles and quiet evenings. Perfect for families with children.',
          city: 'Los Angeles',
          adoption_fee: 150,
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Luna',
          species: 'Dog',
          breed: 'Border Collie',
          age: '4 years',
          gender: 'Female',
          description: 'Intelligent and loyal companion. Great with kids and other pets. Needs daily exercise.',
          city: 'Chicago',
          adoption_fee: 250,
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          name: 'Charlie',
          species: 'Cat',
          breed: 'Persian',
          age: '1 year',
          gender: 'Male',
          description: 'Young and playful cat with beautiful long fur. Looking for a loving home.',
          city: 'Houston',
          adoption_fee: 180,
          created_at: new Date().toISOString()
        },
        {
          id: 5,
          name: 'Daisy',
          species: 'Dog',
          breed: 'Labrador Mix',
          age: '5 years',
          gender: 'Female',
          description: 'Sweet and calm dog, perfect for seniors or families. House trained and well-behaved.',
          city: 'Phoenix',
          adoption_fee: 175,
          created_at: new Date().toISOString()
        }
      ];

      // Try to get real pets from database first
      let pets = [];
      try {
        pets = await petModel.getAll();
      } catch (dbError) {
        console.log('Database not available, using demo pets for feed');
        pets = demoPets;
      }

      // Apply filters
      if (species) {
        pets = pets.filter(pet =>
          (pet.species || pet.SPECIES || '').toLowerCase().includes(species.toLowerCase())
        );
      }

      if (breed) {
        pets = pets.filter(pet =>
          (pet.breed || pet.BREED || '').toLowerCase().includes(breed.toLowerCase())
        );
      }

      if (zone) {
        pets = pets.filter(pet =>
          (pet.city || pet.CITY || '').toLowerCase().includes(zone.toLowerCase())
        );
      }

      // Sort by type
      if (type === 'popular') {
        // Sort by a popularity metric (for demo, just reverse order)
        pets = pets.reverse();
      } else {
        // Sort by created date (recent first)
        pets = pets.sort((a, b) => {
          const dateA = new Date(a.created_at || a.CREATED_AT || 0);
          const dateB = new Date(b.created_at || b.CREATED_AT || 0);
          return dateB - dateA;
        });
      }

      // Limit results
      pets = pets.slice(0, parseInt(limit));

      sendResponse(res, 200, {
        success: true,
        data: pets,
        meta: {
          type,
          filters: { zone, breed, species },
          count: pets.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error getting pets feed:', error);
      sendResponse(res, 500, {
        error: 'Failed to fetch pets feed',
        message: error.message
      });
    }
  }

  async getPetsByTagOverlap(req, res, userId) {
    try {
      const limit = parseInt(req.query.limit) || 20;

      if (!userId) {
        return sendResponse(res, 400, { error: 'User ID is required' });
      }

      const pets = await petModel.getPetsByTagOverlap(userId, limit);
      sendResponse(res, 200, { success: true, data: pets, count: pets.length });
    } catch (error) {
      console.error('Error getting pets by tag overlap:', error);
      sendResponse(res, 500, { error: 'Failed to fetch pets by tag overlap', message: error.message });
    }
  }
}

module.exports = new PetController();