function checkDataExists(field, subfield) {
    if (field && field[subfield]) {
        return true; 
    }
    return false;
}
export function formatCitation(data, template) {
    const familyName = checkDataExists(data["028A"],["A"]) ? data["028A"]["A"] : ""
    const givenName = checkDataExists(data["028A"],["D"]) ? data["028A"]["D"] : ""
    const title = checkDataExists(data["021A"],["a"]) ? data["021A"]["a"].replace('@', '') : ""
    const edition = checkDataExists(data["032@"],["a"]) ? data["032@"]["a"] : ""
    const placeOfPublication = checkDataExists(data["033A"],["p"]) ? data["033A"]["p"] : ""
    const yearOfPublication = checkDataExists(data["011@"],["a"]) ? data["011@"]["a"] : ""


    let citation = ""
    if (template === "dns" || !template) {
        // family name
        citation += familyName;
        // given name
        citation += givenName ? `, ${givenName}: ` : ":";
        // title
        citation += title ? `##t#${title}#t##. ` : "";
        // edition
        citation += edition ? `${edition}. ` : "";
        // place of publication
        citation += placeOfPublication ? `${placeOfPublication} ` : "";
        // year of publication
        citation += yearOfPublication ? `${yearOfPublication}` : "";
    }
    return {
        plainText: citation.replace(/##t#/g, '').replace(/#t##/g, ''),
        html: citation.replace(/##t#/g, '<em>').replace(/#t##/g, '</em>')
    }
}
