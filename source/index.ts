#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import fs from 'fs';
import he from 'he';
import program from 'commander';
import puppeteer from 'puppeteer';
import request from 'request';
import * as settings from "./settings.json";
const domQueries = settings.queries;

async function doStuff(parameters: { showBrowser: boolean, outputFolder: string, performDownload: boolean }) {
    const browser = await puppeteer.launch({ headless: !parameters.showBrowser });
    const page = await browser.newPage();
    await page.goto(settings.carTalkPage, { waitUntil: 'networkidle2' });

    console.log(chalk.blueBright(figlet.textSync('Car Talk Downloader', { horizontalLayout: 'full' })));

    console.log(chalk.bold.bgMagenta(`\n Download path: '${program.outputFolder}' \n`));
    console.log(chalk.green("Expanding page to expose all download buttons..."));

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

            await buttonHandle.click().catch(e => console.log(chalk.red(`Error clicking button: ${e.message}`)));

            if (settings.moreLogging) { console.log(chalk.dim.white("Trying to load more...")); }
            await page.waitFor(settings.loadMoreDelay_ms);
        }

        currentDownloadButtonCount = (await page.$$(domQueries.downloadButtons)).length;

        console.log(chalk.dim.white(`Found ${currentDownloadButtonCount} download buttons so far.`));

        isNotHidden = await page.evaluate(selector => {
            const elem = document.querySelector(selector);
            return elem ? window.getComputedStyle(elem).getPropertyValue('display') !== 'none' : false;
        }, domQueries.loadMoreButtons);

        if (currentDownloadButtonCount == previousDownloadButtonCount) {
            currentLoadMoreTryCount += 1;
        } else {
            currentLoadMoreTryCount = 0;
        }

        if (currentLoadMoreTryCount > settings.loadMoreMaxAttempts) {
            console.log(chalk.yellowBright(`No more buttons have been loaded after ${currentLoadMoreTryCount} attempts. Starting download process.`));
            break;
        }

        previousDownloadButtonCount = currentDownloadButtonCount;
    }

    console.log(chalk.blueBright("Page fully expanded"));

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
            console.log(chalk.yellow(`File ${fileName} already exists.`));
            continue;
        }

        console.log(chalk.blue(`Downloading '${fileName}' (${currentDownloadCount}/${buttonData.length})`));
        // Important Fix: TypeScript assertion that `link` is not null.
        await downloadAudioFromLinkAsync(link!, fileName, folderPath).catch(error => console.log(chalk.red(`Error in downloading: ${error}`)));
        currentDownloadCount++;
    }

    console.log(chalk.green(`\n Downloaded ${buttonData.length} files to '${parameters.outputFolder}'`));

    await page.close();
    await browser.close(); // Ensure the browser is closed after operation
}

async function downloadAudioFromLinkAsync(link: string, fileName: string, folderPath: string) {
    const fullFilePath = folderPath + "/" + fileName;
    const filePipe = fs.createWriteStream(fullFilePath);

    await new Promise<void>((resolve, reject) => {
        let stream = request(link)
            .pipe(filePipe)
            .on('finish', () => {
                if (settings.moreLogging) { console.log(`The file ${fileName} is finished downloading.`); }
                resolve();
            })
            .on('error', (error) => {
                console.log(chalk.red(`Error downloading file ${fileName}: ${error}`));
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
    if (settings.moreLogging) { console.log(chalk.dim.white(`Original title: ${title}`)); }
    if (!title) {
        console.log(chalk.red("No title! Saving as Unknown_Title.mp3"));
        return "Unknown_Title.mp3";
    }
    let decodedTitle = he.decode(title);
    decodedTitle = decodedTitle.replace(':', ' -').replace('#', '').replace(/[<>:"\/\\|?*]+/g, '_');

    return decodedTitle.trim() + ".mp3";
}

const defaultPath = getAppDataPath() + "\\cartalkad";

program
    .name("cartalkad")
    .version('0.1.1')
    .description('Download publicly available Car Talk episodes via a CLI!')
    .option('--show-browser', 'Displays the web browser instance as the downloader is running. Helpful if you think it\'s having problems.', false)
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
    return process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
}
