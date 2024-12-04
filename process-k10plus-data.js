import fs from 'fs/promises';
import path from 'path';
import { parseStringPromise } from 'xml2js';

const fetchAndSaveXmlAsJson = async () => {
  try {
    // const id = '1617029572';
    const id = '1682092178';
    const label = 'Rave';
    const xmlUrl = `https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.ppn=${id}&recordSchema=picaxml&startRecord=1&maximumRecords=1`; 
    
    console.log('Fetching XML data...');
    const response = await fetch(xmlUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch XML: ${response.statusText}`);
    }

    const xmlData = await response.text();

    console.log('Parsing XML to JSON...');
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false, // Simplifies resulting JSON structure
      mergeAttrs: true, // Combines attributes and child elements
    });
    const reducedJsonData = jsonData['zs:searchRetrieveResponse']['zs:records']['zs:record']['zs:recordData']['record']['datafield'];
    const mappedJSONData = reducedJsonData.map((data) => {
        return {
            [data['tag']]: data,
        };
    });
    let dataObject = {};
    mappedJSONData.forEach((item) => {
        const key = Object.keys(item)[0];
        dataObject[key] = item[key];
    });
    for (let entry in dataObject) {
        dataObject[entry].subMetadata = {};
        // if (dataObject[entry].subfield && Array.isArray(dataObject[entry].subfield)) {
        //     for (let sub of dataObject[entry].subfield) {
        //         if (!dataObject.subMetadata[sub['code']]) continue;
        //         // dataObject[entry].subMetadata[sub['code']] = sub['_'];
        //         dataObject[entry].subMetadata[[sub['code']]] = sub['_'];
        //     }
        // };
        if (dataObject[entry].subfield && !Array.isArray(dataObject[entry].subfield)) {
            dataObject[entry].subMetadata = {
                [dataObject[entry].subfield['code']]: dataObject[entry].subfield['_'],
            };
        }
    }
    // Define the output directory and file path
    const outputDir = path.resolve('./inspection');
    const outputFile = path.join(outputDir, `bibliographical-info-${label}.json`);

    // Ensure the directory exists
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Saving JSON to ${outputFile}...`);
    await fs.writeFile(outputFile, JSON.stringify(mappedJSONData, null, 2), 'utf8');

    console.log('JSON file saved successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Run the function
fetchAndSaveXmlAsJson();
