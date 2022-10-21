/**
 * @file image-process/load-img-from-url.js
 * @desc an async function to turn a url to An Image object
 */

/**
 * @function loadImageFromURL - 从 URL 加载图片
 * @param {string} url - image URL
 * @returns Promise<Image>
 * */
function loadImageFromURL(url){
  const image = new Image();
  image.setAttribute("crossOrigin", "Anonymous");

  return new Promise((resolve, reject) => {
    image.onload = () => {
        resolve(image)
    }
    image.onerror = reject;
    image.src = url;
  });
}