class NavbarService {
  async fetchGlobalComponents() {
    try {
      const response = await fetch('../global/global.html');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error fetching global components:', error);
      throw error;
    }
  }

  parseGlobalComponents(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    return {
      header: tempDiv.querySelector('header'),
      footer: tempDiv.querySelector('footer')
    };
  }
}

export default NavbarService;
