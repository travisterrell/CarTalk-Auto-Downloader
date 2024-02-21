#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';
import puppeteer from 'puppeteer';
import fs from 'fs';
import request from 'request';
import he from 'he';
import * as settings from "./settings.json";
const domQueries = settings.queries;

async function doStuff(parameters: { showBrowser: boolean, outputFolder: string, performDownload: boolean }) {
    const browser = await puppeteer.launch({ headless: !parameters.showBrowser });
    const page = await browser.newPage();
    await page.goto(settings.carTalkPage, { waitUntil: 'networkidle2' });

    console.log(chalk.blueBright(figlet.textSync('Car Talk Downloader', { horizontalLayout: 'full' })));
    console.log("Start");

    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

    let isNotHidden = await page.evaluate(selector => {
        const elem = document.querySelector(selector);
        return elem ? window.getComputedStyle(elem).getPropertyValue('display') !== 'none' : false;
    }, domQueries.loadMoreButtons);

    let previousDownloadButtonCount = 0;
    let currentDownloadButtonCount = 0;
    let currentLoadMoreTryCount = 0;

    // for (let i = 5; i > 0; i--) { //For debugging purposes
    while (isNotHidden) {
        let buttonHandle = await page.$(domQueries.loadMoreButtons);

        if (buttonHandle) {
            await buttonHandle.evaluate(b => b.scrollIntoView());

            await buttonHandle.click().catch(e => console.log(`Error clicking button: ${e.message}`));
            console.log("Trying to load more...");

            await page.waitFor(settings.loadMoreDelay_ms);
        }

        currentDownloadButtonCount = (await page.$$(domQueries.downloadButtons)).length;

        console.log(`Found ${currentDownloadButtonCount} download buttons so far.`);

        isNotHidden = await page.evaluate(selector => {
            const elem = document.querySelector(selector);
            return elem ? window.getComputedStyle(elem).getPropertyValue('display') !== 'none' : false;
        }, domQueries.loadMoreButtons);

        if (currentDownloadButtonCount == previousDownloadButtonCount) {
            currentLoadMoreTryCount += 1;
        } else {
            currentLoadMoreTryCount = 0;
        }

        if (currentLoadMoreTryCount > 5) {
            console.log(`No more buttons have been loaded after ${currentLoadMoreTryCount} attempts. Starting download process.`);
            break;
        }

        previousDownloadButtonCount = currentDownloadButtonCount;
    }

    console.log("Page fully expanded");

    const rawButtonData = await page.$$eval(domQueries.downloadButtons, buttons => buttons.map(button => {
        const link = button.getAttribute("href");
        const titleAttr = button.getAttribute("data-metrics-ga4");
        const title = titleAttr ? JSON.parse(titleAttr).title : null;
        return { link, title };
    }));

    const buttonData = rawButtonData.filter(({ link, title }) => link && title);

    const folderPath = parameters.outputFolder;
    const existingFiles = getExistingFiles(folderPath);

    let currentDownloadCount = 1;
    for (let { link, title } of buttonData) {
        const fileName = getFileName(title);

        if (existingFiles.has(fileName)) {
            console.log(`File ${fileName} already exists.`);
            continue;
        }

        console.log(`Downloading '${fileName}' (${currentDownloadCount}/${buttonData.length})`);
        // Important Fix: TypeScript assertion that `link` is not null.
        await downloadAudioFromLinkAsync(link!, fileName, folderPath).catch(error => console.log(`Error in downloading: ${error}`));
        currentDownloadCount++;
    }

    console.log(`Downloaded ${buttonData.length} files to '${parameters.outputFolder}'`);

    await page.close();
    await browser.close(); // Ensure the browser is closed after operation
}

function notNullOrUndefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

async function downloadAudioFromLinkAsync(link: string, fileName: string, folderPath: string) {
    const fullFilePath = folderPath + "/" + fileName;
    const filePipe = fs.createWriteStream(fullFilePath);

    await new Promise<void>((resolve, reject) => {
        let stream = request(link)
            .pipe(filePipe)
            .on('finish', () => {
                // console.log(`The file ${fileName} is finished downloading.`);
                resolve();
            })
            .on('error', (error) => {
                console.log(`Error downloading file ${fileName}: ${error}`);
                reject(error);
            });
    });
}

function getExistingFiles(filePath: string) {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath);
    }

    return new Set(fs.readdirSync(filePath));
}

function getFileName(title: string | null): string {
    if (!title) {
        console.log("No title");
        return "Unknown_Title.mp3";
    }
    console.log(`Original title: ${title}`);

    let decodedTitle = he.decode(title);
    decodedTitle = decodedTitle.replace(':', ' -').replace('#', '').replace(/[<>:"\/\\|?*]+/g, '_');

    return decodedTitle.trim() + ".mp3";
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const defaultPath = getAppDataPath() + "\\cartalkad";

program
    .name("cartalkad")
    .version('0.1')
    .description('Download publicly available Car Talk episodes via a CLI!')
    .option('--show-browser', 'Displays the web browser instance as the downloader is running.', false)
    .option('-f, --output-folder <path>', 'Specify the output folder for downloads.', defaultPath)
    .option('-d, --dry-run', 'Run the script without downloading files to show what would be downloaded.', false)
    .option('-e, --download-new-episodes', 'Download new episodes not already present in the output directory.', false)
    .parse(process.argv);

const outFolder = program.outputFolder;

if (!process.argv.slice(2).length) {
    program.outputHelp();
} else {
    doStuff({
        outputFolder: outFolder,
        showBrowser: program.showBrowser,
        performDownload: program.downloadNewEpisodes
    });
}

function getAppDataPath() {
    // return 'S:\\Audio';
    return process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
}
