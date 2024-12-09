import fs from 'fs/promises';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { formatCitation } from './modules/format-citation.js';

const root = process.cwd();

async function fetchAndSaveXmlAsJson (params) {
    const { id, label } = params;
    try {
        // Configure the target ID and label for the request and output file
        const xmlUrl = `https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.ppn=${id}&recordSchema=picaxml&startRecord=1&maximumRecords=1`;

        console.log('Fetching XML data...');
        const response = await fetch(xmlUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch XML: ${response.statusText}`);
        }

        const xmlData = await response.text();
        await fs.writeFile(path.join(root, 'inspection', `xml-${label}.xml`), xmlData, 'utf8');

        console.log('Parsing XML to JSON...');
        const jsonData = await parseStringPromise(xmlData, {
            explicitArray: false, // Simplifies resulting JSON structure
            mergeAttrs: true, // Combines attributes and child elements
        });

        // Reduce and map the JSON data
        const reducedJsonData = jsonData['zs:searchRetrieveResponse']['zs:records']['zs:record']['zs:recordData']['record']['datafield'];
        const mappedJSONData = reducedJsonData.map((data) => {
            return {
                [data['tag']]: data,
            };
        });
        fs.writeFile(path.join(root, 'inspection', `json-${label}.json`), JSON.stringify(mappedJSONData, null, 2), 'utf8');
        // Convert mapped data to a structured object
        let dataObject = {};
        mappedJSONData.forEach((item) => {
            const key = Object.keys(item)[0];
            dataObject[key] = item[key];
        });

        // Process subfields to generate subMetadata
        for (let entry in dataObject) {
            if (dataObject[entry].subfield) {
                // Handle both array and non-array cases for `subfield`
                if (Array.isArray(dataObject[entry].subfield)) {
                    for (let sub of dataObject[entry].subfield) {
                        if (sub.code && sub._) {
                            dataObject[entry][sub.code] = sub._;
                            // dataObject[entry].subMetadata[sub.code] = sub._;
                        }
                    }
                } else if (dataObject[entry].subfield.code && dataObject[entry].subfield._) {
                    // dataObject[entry].subMetadata[dataObject[entry].subfield.code] = dataObject[entry].subfield._;
                    dataObject[entry][dataObject[entry].subfield.code] = dataObject[entry].subfield._;
                }
            }
            delete dataObject[entry].subfield
            delete dataObject[entry].tag
        }

        // Define the output directory and file path
        const outputDir = path.resolve('./inspection');
        const outputFile = path.join(outputDir, `bibliographical-info-${label}.json`);

        // Ensure the directory exists
        await fs.mkdir(outputDir, { recursive: true });

        console.log(`Saving JSON to ${outputFile}...`);
        await fs.writeFile(outputFile, JSON.stringify(dataObject, null, 2), 'utf8');
        
        const citation = formatCitation(dataObject, 'dns');
        // fs.writeFileSync(path.join(root, 'output', `citation-${label}.txt`), citation, 'utf8');
        const outputCitationDir = path.join(root, 'output');
        await fs.mkdir(outputCitationDir, { recursive: true });
        await fs.writeFile(path.join(root, 'output', `citation-${label}.json`), JSON.stringify(citation, null, 2), 'utf8');

        console.log('JSON file saved successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
};

// Run the function
fetchAndSaveXmlAsJson({
    id: '1616489472', 
    label: 'Wissensdinge'
});
