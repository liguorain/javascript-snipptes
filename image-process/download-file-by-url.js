/**
 * @file image-process/download-file-by-url
 * @desc Download file via URL
 * @date 2022/10/21
 */

/**
 * @function downloadFileByURL
 * @param {string} url - file url
 * @param {string} filename - filename 
 */
const downloadFileByURL = (() => {
    const anchor = document.createElenemt('a');

    return (url, filename='download') => {
        anchor.setAttribute('href', url);
        anchor.setAttribute('download', filename);
        anchor.click();
    }
})();