import fs from 'fs/promises';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { formatCitation } from './modules/format-citation.js';


// Constants
const BASE_URL = process.env.XML_BASE_URL || 'https://sru.k10plus.de/opac-de-627';
const OUTPUT_DIR = path.resolve(process.cwd(), 'inspection');
const CITATION_DIR = path.resolve(process.cwd(), 'output');

// Utility Function: Ensure Directory
const ensureDirectoryExists = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        console.error(`Failed to create directory: ${dirPath}`, error.message);
        throw error;
    }
};

// Fetch XML Data
const fetchXmlData = async (id) => {
    const url = `${BASE_URL}?version=1.1&operation=searchRetrieve&query=pica.ppn=${id}&recordSchema=picaxml&startRecord=1&maximumRecords=1`;
    console.log(`Fetching XML from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch XML: ${response.statusText} (Status: ${response.status})`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching XML: ${error.message}`);
        throw error;
    }
};

// Parse XML to JSON
const parseXmlToJson = async (xmlData) => {
    try {
        return await parseStringPromise(xmlData, {
            explicitArray: false,
            mergeAttrs: true,
        });
    } catch (error) {
        console.error('Error parsing XML to JSON:', error.message);
        throw error;
    }
};

// Reduce and Map JSON Data
const transformJsonData = (jsonData) => {
    try {
        const reducedData = jsonData['zs:searchRetrieveResponse']['zs:records']['zs:record']['zs:recordData']['record']['datafield'];
        return reducedData.map((field) => {
            const tag = field['tag'];
            return { [tag]: field };
        });
    } catch (error) {
        console.error('Error reducing JSON data:', error.message);
        throw error;
    }
};

// Generate and Save Transformed JSON
const saveJsonFile = async (filePath, data) => {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`JSON saved successfully at: ${filePath}`);
    } catch (error) {
        console.error(`Error saving JSON to ${filePath}:`, error.message);
        throw error;
    }
};

// Enhance JSON Data with Subfield Mapping
const enhanceJsonData = (mappedData) => {
    const enhancedData = {};

    mappedData.forEach((item) => {
        const key = Object.keys(item)[0];
        const entry = item[key];

        // Flatten subfield data
        const flattenedEntry = {};
        if (entry.subfield) {
            if (Array.isArray(entry.subfield)) {
                entry.subfield.forEach((sub) => {
                    if (sub.code && sub._) {
                        flattenedEntry[sub.code] = sub._;
                    }
                });
            } else if (entry.subfield.code && entry.subfield._) {
                flattenedEntry[entry.subfield.code] = entry.subfield._;
            }
        }

        // Add or append the flattened entry to the result object
        if (!enhancedData[key]) {
            enhancedData[key] = [];
        }
        enhancedData[key].push(flattenedEntry);
    });

    return enhancedData;
};

// Main Function: Fetch and Process Data
const fetchAndSaveXmlAsJson = async ({ id, label }) => {
    try {
        await ensureDirectoryExists(OUTPUT_DIR);
        await ensureDirectoryExists(CITATION_DIR);

        const xmlData = await fetchXmlData(id);
        const xmlFilePath = path.join(OUTPUT_DIR, `xml-${label}.xml`);
        await fs.writeFile(xmlFilePath, xmlData, 'utf8');
        console.log(`Raw XML saved at: ${xmlFilePath}`);

        const jsonData = await parseXmlToJson(xmlData);
        const mappedData = transformJsonData(jsonData);
        const enhancedData = enhanceJsonData(mappedData);

        const jsonFilePath = path.join(OUTPUT_DIR, `bibliographical-info-${label}.json`);
        await saveJsonFile(jsonFilePath, enhancedData);

        const citation = formatCitation(enhancedData, 'dns');
        const citationFilePath = path.join(CITATION_DIR, `citation-${label}.json`);
        await saveJsonFile(citationFilePath, citation);

        console.log('Process completed successfully!');
    } catch (error) {
        console.error('Error during processing:', error.message);
    }
};

// Example Invocation
fetchAndSaveXmlAsJson({
    id: '1844708160',
    label: 'Bourdieu',
});
fetchAndSaveXmlAsJson({
    id: '1616489472',
    label: 'Wissensdinge',
});
fetchAndSaveXmlAsJson({
    id: '1041305176',
    label: 'Delillo',
});
