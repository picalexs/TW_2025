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
      });      busboy.on('finish', async () => {
        try {
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
    const mediaDir = path.join(__dirname, '../../server/animal', petId.toString());
    
    try {
      await fs.mkdir(mediaDir, { recursive: true });
    } catch (error) {
      console.error("Error creating directory:", error);
      throw new Error("Failed to create media directory");
    }
    
    const mediaPaths = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const ext = path.extname(file.originalname) || (file.mimetype.includes('image') ? '.jpg' : '.mp4');
      
      let filename;
      if (i === profileImageIndex) {
        filename = `profile${ext}`;
      } else {
        const fileNumber = i < profileImageIndex ? i + 1 : i;
        filename = `${fileNumber}${ext}`;
      }
      
      const filepath = path.join(mediaDir, filename);
      const relativePath = `/server/animal/${petId}/${filename}`;
      
      try {
        await fs.writeFile(filepath, file.buffer);
        mediaPaths.push({
          type: file.mimetype.startsWith('image') ? 'image' : 'video',
          path: relativePath,
          isProfile: i === profileImageIndex
        });
      } catch (error) {
        console.error(`Error saving file ${filename}:`, error);
        throw new Error(`Failed to save file ${filename}`);
      }
    }
    
    return mediaPaths;
  }

  async updatePet(req, res, id) {
    try {
      const petData = await collectRequestData(req);
      const updatedPet = await petModel.updatePet(id, petData);
      if (updatedPet) {
        sendResponse(res, 200, updatedPet);
      } else {
        sendResponse(res, 404, { error: "Pet not found for update" });
      }
    } catch (error) {
      console.error(`Error updating pet with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to update pet", message: error.message });
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
}

module.exports = new PetController();