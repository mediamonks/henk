const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

module.exports = class Flashtalking {

  constructor(auth) {
    this.auth = auth;
  }

  async getLibraries(options = {}) {
    //options.advancedFilter - string - unsure what this does
    //options.fields - string - only these fields per entry will be returned. comma separated values
    //options.includeArchived - boolean - does what it says, default false
    //options.page - int - page to show, default 1
    //options.rpp - int - results per page, default 25,
    //options.searchTerm - string - Searches fields for the given term

    const url = 'https://api.flashtalking.net/crm/v1/creative-libraries'

    const params = {};
    for (const [key, value] of Object.entries(options)) {
      params[key]=value;
    }

    const headers = {
      'Authorization': this.auth
    }

    try {
      const results = await axios.get(url, { headers, params })
      return results.data;
    }

    catch(err) {
      console.log(err.response.data)
    }
  }

  async getLibrary(libraryId = '') {
    //libraryId - string - library ID

    const url = 'https://api.flashtalking.net/crm/v1/creative-libraries/' + libraryId;

    const headers = {
      'Authorization': this.auth
    }

    try {
      const results = await axios.get(url, { headers })
      return results.data;
    }

    catch(err) {
      console.log(err.response.data)
    }
  }

  async createLibrary(options = {}) {
    //name - string
    //email - string
    //advertiserName

    //brand - string


    const url = 'https://api.flashtalking.net/crm/v1/creative-libraries'

    const data = {};
    for (const [key, value] of Object.entries(options)) {
      data[key]=value;
    }

    const headers = {
      'Authorization': this.auth
    }

    try {
      const results = await axios.post(url, data, { headers })
      return results.data;
    }

    catch(err) {
      console.log(err.response.data)
    }
  }


  async getCreative(creativeId = '') {
    //returns single creative based on creative ID
    //creativeId - string - creative ID

    const url = 'https://api.flashtalking.net/crm/v1/creatives/' + creativeId;

    const headers = {
      'Authorization': this.auth
    }

    try {
      const results = await axios.get(url, { headers })
      return results.data;
    }

    catch(err) {
      console.log(err.response.data)
    }
  }

  async getCreatives(libraryId = '', options = {}) {
    //returns all creatives in library
    //libraryId - string - library ID
    //options.advancedFilter - string - unsure what this does
    //options.fields - string - only these fields per entry will be returned. comma separated values
    //options.includeArchived - boolean - does what it says, default false
    //options.page - int - page to show, default 1
    //options.rpp - int - results per page, default 25,
    //options.searchTerm - string - Searches fields for the given term

    const url = 'https://api.flashtalking.net/crm/v1/creative-libraries/' + libraryId + '/creatives';

    const params = {};
    for (const [key, value] of Object.entries(options)) {
      params[key]=value;
    }

    const headers = {
      'Authorization': this.auth
    }

    try {
      const results = await axios.get(url, { headers, params })
      return results.data;
    }

    catch(err) {
      console.log(err.response.data)
    }
  }

  async createCreative(libraryId = '', options = {}) {
    //libraryId
    //filename - string
    //adType - string - 'HTML_onpage'

    const url = 'https://api.flashtalking.net/crm/v1/creative-libraries/' + libraryId + '/creatives';

    const data = {};
    for (const [key, value] of Object.entries(options)) {
      data[key]=value;
    }

    const headers = {
      'Authorization': this.auth
    }

    try {
      const results = await axios.post(url, data, { headers })
      return results.data;
    }

    catch(err) {
      console.log(err.response.data)
    }
  }

  async uploadCreative(libraryId = '', filePath = '', options = {}) {
    //libraryId - string
    //filePath - string

    //options.overwriteExistingImages
    //options.useExistingImages

    const url = 'https://api.flashtalking.net/crm/v1/creative-libraries/' + libraryId + '/creatives/import';

    const data = new FormData();
    data.append('file', fs.createReadStream(filePath));

    const headers = {
      'Authorization': this.auth,
      ...data.getHeaders()
    }

    const params = {};
    for (const [key, value] of Object.entries(options)) {
      params[key]=value;
    }

    try {
      const results = await axios.post(url, data, { headers, params })
      return results;
    }

    catch(error) {
      //console.log(err.response.data)
      return error;
    }
  }


  async overwriteCreative(creativeId = '', filePath = '', options = {}) {
    //creativeId - string
    //filePath - string

    //options.overwriteExistingImages
    //options.useExistingImages

    const url = 'https://api.flashtalking.net/crm/v1/creatives/overwrite/' + creativeId

    const data = new FormData();
    data.append('file', fs.createReadStream(filePath));

    const headers = {
      'Authorization': this.auth,
      ...data.getHeaders()
    }

    const params = {};
    for (const [key, value] of Object.entries(options)) {
      params[key]=value;
    }

    try {
      const results = await axios.post(url, data, { headers, params })
      return results;
    }

    catch(error) {
      return error;
    }
  }


  async getPreview(libraryId = '') {
    //libraryId - string - library ID

    const url = 'https://api.flashtalking.net/crm/v1/creative-libraries/' + libraryId;

    const headers = {
      'Authorization': this.auth
    }

    try {
      const results = await axios.get(url, { headers })
      return results.data;
    }

    catch(err) {
      console.log(err.response.data)
    }
  }
}
