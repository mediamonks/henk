const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const puppeteer = require('puppeteer');

const getCookie = (cookies, cookieID) => cookies.filter((cookie) => cookie.name === cookieID);

const extractString = (fullStr, preStr, postStr) => {
    const firstIndex = fullStr.indexOf(preStr) + preStr.length;
    const lastIndex = fullStr.indexOf(postStr, firstIndex);
    return fullStr.substr(firstIndex, lastIndex - firstIndex);
}

module.exports = class WorkspaceAPI {

    async login(options = {}) {
        console.log('Logging in user ' + options.username)

        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: {
                width: 900,
                height: 700,
            },
        });

        const page = await browser.newPage();

        const navigationPromise = page.waitForNavigation({
            waitUntil: 'load',
        });

        console.log('Opening login page...')
        await page.goto('https://sso.theasset.store/');

        await navigationPromise;

        await page.waitForSelector('input[name="email"]');
        await page.type('input[name="email"]', options.username);
        console.log('Entered username');

        const [ nextButton ] = await page.$x("//button[contains(., 'Next')]");
        await nextButton.click();

        await page.waitForTimeout(500)
        await page.waitForSelector('input[name="password"]');
        await page.click('input[name="password"]');
        await page.type('input[name="password"]', options.password);
        console.log('Entered password');

        const [ loginButton ] = await page.$x("//button[contains(., 'Login')]");
        await loginButton.click();
        console.log('Click login');

        await page.waitForTimeout(500)

        await page.goto('https://workspace.mediamonks.com/backend/default');
        await browser.waitForTarget((target) => target.url().indexOf('https://workspace.mediamonks.com/backend/default') === 0, {
            timeout: 0,
        });

        console.log('Logged into workspace, saving cookies');

        const client = await page.target().createCDPSession();
        const { cookies } = await client.send('Network.getAllCookies');

        console.log('Cookies saved, closing puppeteer');
        await browser.close();

        return cookies;
    }

    async upload(options = {}) {
        console.log('Uploading creatives...');

        const uploadUrl = "https://workspace.mediamonks.com/backend/project-folder/materials-upload?id=" + options.libraryId;
        const inputDir = options.inputDir;

        const files = await fs.readdirSync(inputDir)
        const zipFiles = files.filter(filename => filename.substr(filename.length-4, filename.length) === '.zip');

        //get php session ID and _csrf from cookie
        const cookies = options.cookies;
        const [ cookiePhpsessid ] = await getCookie(cookies, 'PHPSESSID')
        const [ cookieCsrf ] = await getCookie(cookies, '_csrf')
        const headerCookies = "PHPSESSID=" + cookiePhpsessid.value + "; _csrf=" + cookieCsrf.value;

        let csrf_token = '';

        //running via proxy so Charles can see the requests
        const proxy = {
            host: 'localhost',
            port: 8888
        }

        console.log('Retrieving _csrf token...')

        try {
            //const result = await axiosGetInstance.get(uploadUrl);
            const result = await axios.get(uploadUrl, {
                headers: {
                    Cookie: headerCookies
                }
            });

            csrf_token = extractString(result.data, "<meta name=\"csrf-token\" content=\"", "\">");

            console.log('Done.')
        }

        catch (err) {
            console.log(err)
        }


        for (const filename of zipFiles) {
            const filePath = inputDir + '/' + filename;

            const data = new FormData();
            data.append('_csrf', csrf_token)
            data.append('UploadForm[files]', fs.createReadStream(filePath))

            console.log('Uploading ' + filePath)

            try {
                // const result = await axiosInstance.post(uploadUrl, data);
                const result = await axios.post(uploadUrl, data, {
                    headers: {
                        Cookie: headerCookies,
                        ...data.getHeaders()
                    }
                });

                console.log(result.statusText);
            } catch (err) {
                console.log(err)
            }
        }

    }
}