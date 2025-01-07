import { translations } from '../config/translations.js';

function close(type, lang) {
    const types = {
        editors: {
            de: {
                marker: " (Hrsg.)",
                separator: ": "
            }
        },
        authors: {
            de: {
                marker: "",
                separator: ": "
            }
        }
    };
    

        
    return types[type][lang].marker + types[type][lang].separator;
}


function checkDataExists(field, subfield) {
    if (field && field[0][subfield]) {
        return true; 
    }
    return false;
}

function checkIfEditorsOnly(data) {
    if (!data["028A"]) {
        return true;
    }
    return false;
}

function composeNameData(entry) {
    let name = "";
    if (entry["a"] || entry["A"]) {
        name += entry["a"] 
            ? entry["a"]
            : entry["A"];
    }
    if (entry["d"] || entry["D"]) {
        name += entry["d"] 
            ? `, ${entry["d"]}`
            : `, ${entry["D"]}`;
    }
    return name;
}

export function formatCitation(data, template, lang) {
    // Handle multiple authors in 028C
    let editors = "";
    // Hook for editors, translators if checks ...
    if (
        Array.isArray(data["028C"]) && 
        data["028C"].length > 0 &&
        !data["028A"]
    ) {
        editors = data["028C"]
            .map(entry => {
                return composeNameData(entry);
            })
            .join("; ");
    }
    let authors = "";
    if (Array.isArray(data["028A"]) && data["028A"].length > 0) {
        authors = data["028A"]
            .map(entry => {
                return composeNameData(entry);
            })
            .join("; ");
    }
    let title = "";
    if (data["021A"]) {
        title += '<em>';
        title += data["021A"][0]["a"];
        title += data["021A"][0]["d"] 
            ? `. ${capitalizeSentence(removeSquareBrackets(data["021A"][0]["d"]))}` 
            : "";
        title += '</em>';
    }
    const edition = checkDataExists(data["032@"], ["a"]) ? data["032@"][0]["a"] : "";
    const placeOfPublication = checkDataExists(data["033A"], ["p"]) ? data["033A"][0]["p"] : "";
    const yearOfPublication = checkDataExists(data["011@"], ["a"]) ? data["011@"][0]["a"] : "";

    let citation = "";
    if (template === "dns" || !template) {
        citation += editors && checkIfEditorsOnly(data)? `${editors}${close('editors', lang)}` : "";
        citation += authors ? `${authors}${editors}${close('authors', lang)}` : "";
        citation += title ? `${title.replace('@', '')}. ` : "";
        citation += edition ? `${edition}. ` : "";
        citation += placeOfPublication ? `${placeOfPublication} ` : "";
        citation += yearOfPublication ? `${yearOfPublication}` : "";
    }
    citation = internationalize(citation, 'la');
    citation = generalCleanup(citation);
    return {
        plainText: citation.replace(/\<em\>/g, '').replace(/\<\/em\>/g, ''),
        html: citation
    };
}

// utils

function capitalizeSentence(sentence) {
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function removeSquareBrackets(str) {
    return str.replace(/^\[|$\]/g, '');
}

function generalCleanup(citation) {
    let clean = citation.replace(/\s;\s/g, '; ');
    clean = clean.replace(/\.{2}\s/g, '. ');
    return clean;
}

function internationalize(citation, lang) {
    if (lang === 'la') {
        for (const term in translations) {
            const translatedTerm = translations[term][lang]; // Get the term for the specified language
            if (translatedTerm) {
                const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                citation = citation.replace(regex, translatedTerm);
            }
        }
    }
    return citation;
}
