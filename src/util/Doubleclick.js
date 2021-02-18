const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const puppeteer = require('puppeteer');
//const tracer = require('tracer');
const path = require('path');
const log = require('tracer').colorConsole({ level: 'info' });

//const log = () => tracer.colorConsole({ level: 'debug' });

const getCookie = (cookies, cookieID) => cookies.filter((cookie) => cookie.name === cookieID);

const getUrlParams = (url) => {
    const theObj = {};
    const theStr = url.substr(url.indexOf(':', 6) + 1, url.length);
    const theArr = theStr.split('&');
    theArr.forEach((param) => {
        const tempArr = param.split('=');
        const tempKey = tempArr[0];
        const tempVal = tempArr[1];
        theObj[tempKey] = tempVal;
    });

    return theObj;
};

const waitForUrl = async (page, url) => {
    const promise = new Promise((resolve) => {
        const checkUrl = setInterval(() => {
            log.debug('checking: ' + page.url());
            if (page.url().indexOf(url) === 0) {
                clearInterval(checkUrl);
                resolve(page.url());
            }
        }, 200);
    });

    return promise;
};

const getFileData = (filePath) => ({
    path: filePath,
    name: path.basename(filePath),
    size: fs.statSync(filePath).size,
    data: fs.createReadStream(filePath),
});


module.exports = class Doubleclick {

    constructor (options = {
        headless: true,
        cookies: []
    }) {
        this.headless = options.headless;
        this.cookies = options.cookies;
        this.dcUrl = 'https://www.google.com/doubleclick/studio/';
        this.accountName = 'Mediamonks';
        this.accountId = '33345';
        this.waitMs = 1000;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: this.headless,
            defaultViewport: {
                width: 900,
                height: 700,
            }
        });

        this.page = await this.browser.newPage();

        if (this.cookies) {
            await this.page.setCookie(...this.cookies);
        }
    }

    async close() {
        await this.browser.close();
    }

    async login(options = {}) {
        const navigationPromise = this.page.waitForNavigation({
            waitUntil: 'load',
        });

        await this.page.goto('https://accounts.google.com/');
        await navigationPromise;

        // CHECK WHAT THE URL IS
        if (this.page.url().indexOf('https://myaccount.google.com/') === 0) {
            log.debug('You are already logged in. You can now run \'npm run upload\'');
            return this.browser.close();
        }

        log.debug('Log into the Google account you use for DoubleClick.');
        await this.browser.waitForTarget((target) => target.url().indexOf('https://myaccount.google.com/') === 0, {
            timeout: 0,
        });

        log.debug("Successfully logged in. You can now run 'npm run upload'");

        const client = await this.page.target().createCDPSession();
        const { cookies } = await client.send('Network.getAllCookies');

        log.debug('Cookie saved, closing puppeteer');
        await this.browser.close();

        return cookies;
    }

    async getAdvertiser(advertiserName) {
        await this.page.goto(this.dcUrl + '#advertisers:');
        return await searchForEntity(this.page, advertiserName)
    }

    async getCampaign(advertiser, campaignName) {
        await this.page.goto(advertiser.url);
        return await searchForEntity(this.page, campaignName)
    }

    async getCreative(campaign, creativeName) {
        await this.page.goto(campaign.url);
        return await searchForEntity(this.page, creativeName)
    }

    async createAdvertiser(advertiserName) {
        const createAdvertiserUrl = this.dcUrl + '#advertiser/new:accountId=' + this.accountId + '&accountName=' + this.accountName;
        const advertiserUrl = this.dcUrl + '#Advertiser:';

        const qsAdvertiserInput = 'input#gwt-debug-advertiser-advertiserName-input';
        const qsAdvertiserSubmit = 'a#gwt-debug-save-button';
        const qsAdvertiserLabel = '#gwt-debug-advertiser-pageTitle-label';

        //log.info('creating new advertiser: ' + advertiserName);
        log.debug('going to page: ' + createAdvertiserUrl);
        await this.page.goto(createAdvertiserUrl);
        log.debug('page loaded: ' + this.page.url());

        log.debug('searching selector: ' + qsAdvertiserInput);
        await this.page.waitForSelector(qsAdvertiserInput);

        log.debug('clicking selector: ' + qsAdvertiserInput);
        await this.page.click(qsAdvertiserInput);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('filling selector: ' + qsAdvertiserInput);
        await this.page.type(qsAdvertiserInput, advertiserName);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsAdvertiserSubmit);
        await this.page.waitForSelector(qsAdvertiserSubmit);

        log.debug('clicking on selector: ' + qsAdvertiserSubmit);
        await this.page.click(qsAdvertiserSubmit);

        log.debug('searching selector: ' + qsAdvertiserLabel);
        await this.page.waitForSelector(qsAdvertiserLabel);

        // wait until we're at the created advertisers page so we can record the url params
        const newUrl = await waitForUrl(this.page, advertiserUrl);
        const urlParams = await getUrlParams(this.page.url());

        return { name: advertiserName, url: this.page.url(), ...urlParams };
    }

    async createCampaign(advertiser, campaignName) {
        const createCampaignUrl = this.dcUrl + '#campaign/new:advertiserId=' + advertiser.advertiserId;
        const campaignUrl = this.dcUrl + '#campaign:';

        const qsCampaignInput = 'input#gwt-debug-new-campaign-campaignText';
        const qsCampaignSubmit = 'a#gwt-debug-save-button';
        const qsCampaignLabel = 'gwt-debug-campaign-pageTitle-label';

        //log.info('creating new campaign: ' + campaignName);
        log.debug('going to page: ' + createCampaignUrl);
        await this.page.goto(createCampaignUrl);
        log.debug('page loaded: ' + this.page.url());

        log.debug('searching selector: ' + qsCampaignInput);
        await this.page.waitForSelector(qsCampaignInput);

        log.debug('clicking selector: ' + qsCampaignInput);
        await this.page.click(qsCampaignInput);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('filling selector: ' + qsCampaignInput);
        await this.page.type(qsCampaignInput, campaignName);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCampaignSubmit);
        await this.page.waitForSelector(qsCampaignSubmit);

        log.debug('clicking selector: ' + qsCampaignSubmit);
        await this.page.click(qsCampaignSubmit);


        // wait until we're at the created campaign page so we can record the url params
        const newUrl = await waitForUrl(this.page, campaignUrl);
        const urlParams = await getUrlParams(this.page.url());

        return { name:campaignName, url: this.page.url(), ...urlParams };
    }

    async createCreative(advertiser, campaign, creative) {
        const createCreativeUrl = this.dcUrl + '#creative/new:campaignId=' + campaign.campaignId + '&advertiserId=' + advertiser.advertiserId;
        const creativeUrl = this.dcUrl + '#creative:step=MANAGE_FILES';

        const qsCreativeNameInput = 'input#gwt-debug-creativeDetail-nameText';
        const qsCreativeFormatDropdown = 'div#gwt-debug-creativeDetail-formatText';
        const qsCreativeFormatValue = '#gwt-debug-creativeDetail-formatText-' + creative.format;

        const qsCreativeSizeDropdown = 'div#gwt-debug-creativeDetail-sizeText';
        const qsCreativeSizeValueCustom = 'div#gwt-debug-creativeDetail-sizeText-CUSTOM';
        const qsCreativeWidthInput = 'input#gwt-debug-creativeDetail-widthText';
        const qsCreativeHeightInput = 'input#gwt-debug-creativeDetail-heightText';

        const qsCreativeSubmit = 'a#gwt-debug-creativeworkflow-next-button';

        //log.info('creating new creative: ' + creative.name);
        log.debug('going to page: ' + createCreativeUrl);
        await this.page.goto(createCreativeUrl);
        log.debug('page loaded: ' + this.page.url());
        await this.page.waitForTimeout(1500);

        log.debug('searching selector: ' + qsCreativeNameInput);
        await this.page.waitForSelector(qsCreativeNameInput);

        log.debug('clicking selector: ' + qsCreativeNameInput);
        await this.page.click(qsCreativeNameInput);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('filling selector: ' + qsCreativeNameInput);
        await this.page.type(qsCreativeNameInput, creative.name);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCreativeFormatDropdown);
        await this.page.waitForSelector(qsCreativeFormatDropdown);

        log.debug('clicking selector: ' + qsCreativeFormatDropdown);
        await this.page.click(qsCreativeFormatDropdown);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCreativeFormatValue);
        await this.page.waitForSelector(qsCreativeFormatValue);

        log.debug('clicking selector: ' + qsCreativeFormatValue);
        await this.page.click(qsCreativeFormatValue);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCreativeSizeDropdown);
        await this.page.waitForSelector(qsCreativeSizeDropdown);

        log.debug('clicking selector: ' + qsCreativeSizeDropdown);
        await this.page.click(qsCreativeSizeDropdown);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCreativeSizeValueCustom);
        await this.page.waitForSelector(qsCreativeSizeValueCustom);

        log.debug('clicking selector: ' + qsCreativeSizeValueCustom);
        await this.page.click(qsCreativeSizeValueCustom);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCreativeWidthInput);
        await this.page.waitForSelector(qsCreativeWidthInput);

        log.debug('clicking selector: ' + qsCreativeWidthInput);
        await this.page.click(qsCreativeWidthInput);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('filling selector: ' + qsCreativeWidthInput);
        await this.page.type(qsCreativeWidthInput, creative.width);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCreativeHeightInput);
        await this.page.waitForSelector(qsCreativeHeightInput);

        log.debug('clicking selector: ' + qsCreativeHeightInput);
        await this.page.click(qsCreativeHeightInput);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('filling selector: ' + qsCreativeHeightInput);
        await this.page.type(qsCreativeHeightInput, creative.height);
        await this.page.waitForTimeout(this.waitMs);

        log.debug('searching selector: ' + qsCreativeSubmit);
        await this.page.waitForSelector(qsCreativeSubmit);

        log.debug('clicking selector: ' + qsCreativeSubmit);
        await this.page.click(qsCreativeSubmit);
        // wait until we're at the created campaign page so we can record the url params

        const newUrl = await waitForUrl(this.page, creativeUrl);
        await this.page.waitForTimeout(this.waitMs);

        const urlParams = await getUrlParams(this.page.url());
        return { name: creative.name, url: this.page.url(), ...urlParams };
    }


    async uploadCreative(advertiser, campaign, creative, inputDir) {
        let url = this.dcUrl + 'upload/rupio';
        const file = getFileData(inputDir + '/' +  creative.filename);
        const data = composeUploadJSON(advertiser, campaign, creative, file);
        const [ cookie ]  = getCookie(this.cookies, 'SID')
        let headers = { Cookie: cookie.name + '=' + cookie.value };

        const proxy = { // for testing with Charles
            host: 'localhost',
            port: 8888
        }
        
        //Part one: request upload ID
        const res = await axios.post(url, data, {
            headers,
            // proxy
        });
        const uid = res.data.sessionStatus.upload_id;
        
        //Part two, upload file
        url += '?upload_id=' + uid + '&file_id=000';
        headers = {
            ...headers,
            'content-type': 'application/octet-stream',
            'Content-Length': file.size,
        };


        
        return await axios.post(url, file.data, {
            headers,
            // proxy
        });
    }

    async getPreviewUrl (advertiser, campaign) {
        const campaignUrl = this.dcUrl + '#campaign:advertiserId=' +  advertiser.advertiserId + '&campaignId=' + campaign.campaignId;
        await this.page.goto(campaignUrl);
        const previewLinkSel = 'a#external-preview-table-anchor-default';
        await this.page.waitForSelector(previewLinkSel);
        return await this.page.$eval(previewLinkSel, e => e.getAttribute('href'));
    };
}

const searchForEntity = async (page, searchQuery) => {
    // CSS selectors :
    // for commencing searches
    const qsSearchInput = '#gwt-debug-table-search-input';
    const qsSearchBtn = '#gwt-debug-table-search-button';
    const qsSearchResult = page.url().indexOf('campaignId') !== -1 ? 'td a[title="' + searchQuery + '" i]' : 'td:first-child a[title="' + searchQuery + '" i]';

    // for search results page
    const qsLoadingDone = "div.gwt-ScrollTable div#gwt-debug-modal-spinner div[aria-hidden='true']";
    const qsHeaders = 'table.headerTable tr';
    const qsData = 'table.dataTable tr';

    const searchResults = [];

    log.debug('searching selector: ' + qsSearchInput);
    await page.waitForSelector(qsSearchInput);

    const isDisabled = await page.$eval(qsSearchInput, (element) => element.hasAttribute('disabled')); // when there are no entities in a advertiser/campaign, the search bar is disabled
    if (isDisabled) {
        log.debug('Search is disabled, so there are no search results.');
        return undefined;
    }

    log.debug('clicking selector: ' + qsSearchInput);
    await page.click(qsSearchInput);
    await page.waitForTimeout(this.waitMs);

    log.debug('filling selector: ' + qsSearchInput);
    await page.type(qsSearchInput, searchQuery);
    await page.waitForTimeout(this.waitMs);

    log.debug('clicking selector: ' + qsSearchBtn);
    await page.click(qsSearchBtn);
    await page.waitForTimeout(this.waitMs);

    log.debug('clicking selector: ' + qsLoadingDone);
    await page.waitForSelector(qsLoadingDone);

    // get headers from search results table
    const headersArr = await page.evaluate(({ qsHeaders }) => Array.from(document.querySelectorAll(qsHeaders),
      (row) => Array.from(row.querySelectorAll('td'),
        (cell) => cell.innerText)), { qsHeaders });
    headersArr.shift(); // first row is empty, so removing first entry in array
    const [headers] = headersArr; // destructure array

    // get results from search results table
    const dataArr = await page.evaluate(({ qsData }) => Array.from(document.querySelectorAll(qsData),
      (row) => Array.from(row.querySelectorAll('td'),
        (cell) => cell.innerText)), { qsData });
    dataArr.shift(); // first row is empty, so removing first entry in array

    // turn headers + data arrays into object with keys
    dataArr.forEach((row) => {
        const newObj = {};
        row.forEach((cell, index) => newObj[headers[index].toLowerCase().replace(' ', '_')] = cell);
        searchResults.push(newObj);
    });

    log.debug('search results parsed, searching through results');
    const searchResultsFilters = searchResults.filter((result) => result.name.toLowerCase() === searchQuery.toLowerCase());

    if (searchResultsFilters.length === 0) {
        log.debug('no results');
        return undefined;
    }

    log.debug(searchResultsFilters.length + ' match found, retrieving IDs from url params...');

    log.debug('searching selector: ' + qsSearchResult);
    await page.waitForSelector(qsSearchResult);

    log.debug('clicking selector: ' + qsSearchResult);
    await page.click(qsSearchResult);
    await page.waitForTimeout(this.waitMs);

    const urlParams = await getUrlParams(page.url());

    return { name: searchQuery, url: page.url(), ...urlParams };
};

const composeUploadJSON = (advertiser, campaign, creative, file) => ({
    protocolVersion: '0.8',
    createSessionRequest: {
        fields: [
            {
                external: {
                    name: 'file',
                    filename: file.name,
                    put: {

                    },
                    size: file.size,
                },
            },
            {
                inlined: {
                    name: 'TYPE',
                    content: 'CREATIVE',
                    contentType: 'text/plain',
                },
            },
            {
                inlined: {
                    name: 'ACCOUNT_ID',
                    content: '33345',
                    contentType: 'text/plain',
                },
            },
            {
                inlined: {
                    name: 'ADVERTISER_ID',
                    content: advertiser.advertiserId,
                    contentType: 'text/plain',
                },
            },
            {
                inlined: {
                    name: 'ADVERTISER_OWNER_ID',
                    content: advertiser.ownerId,
                    contentType: 'text/plain',
                },
            },
            {
                inlined: {
                    name: 'CREATIVE_ID',
                    content: creative.creativeId,
                    contentType: 'text/plain',
                },
            },
            {
                inlined: {
                    name: 'CREATIVE_ENTITY_ID',
                    content: creative.entityId,
                    contentType: 'text/plain',
                },
            },
            {
                inlined: {
                    name: 'CREATIVE_OWNER_ID',
                    content: advertiser.ownerId,
                    contentType: 'text/plain',
                },
            },
            {
                inlined: {
                    name: 'CREATIVE_FORMAT',
                    content: creative.format,
                    contentType: 'text/plain',
                },
            },
        ],
    },
});


