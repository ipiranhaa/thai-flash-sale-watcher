const puppeteer = require('puppeteer')
const path = require('path')
var fs = require('fs')

const urlSettings = {
  domain: 'https://shopee.co.th',
  path: 'flash_sale',
  query: 'categoryId=0',
}
const imageType = 'jpeg'
const directoryPath = path.resolve(__dirname, 'itemImages')
const viewSetting = { width: 1280, height: 720 }

const url = `${urlSettings.domain}/${urlSettings.path}?${urlSettings.query}`

const imagesHaveLoaded = () => {
  return Array.from(document.images).every(i => i.complete)
}

const createFolder = async dir => {
  if (!fs.existsSync(dir)) {
    await fs.mkdirSync(dir)
  }
}

const removeFolder = async dir => {
  if (fs.existsSync(dir)) {
    try {
      await fs.unlinkSync(dir)
    } catch (err) {
      console.error(err)
    }
  }
}

const deleteFolderRecursive = path => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file) {
      var curPath = path + '/' + file
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath)
      } else {
        // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

const init = async () => {
  // Manage directory
  await deleteFolderRecursive(directoryPath)
  await createFolder(directoryPath)

  const browser = await puppeteer.launch({
    headless: false,
    args: [`--window-size=${viewSetting.width},${viewSetting.height}`],
  })
  const page = await browser.newPage()
  await page.setViewport(viewSetting)
  await page.goto(url, { waitUntil: 'networkidle0' })
  // await page.evaluate(async () => {
  //   await window.scrollBy(0, 500)
  //   return Promise.resolve
  // })
  // await page.evaluate(async () => {
  //   await window.scrollBy(0, 0)
  //   return Promise.resolve
  // })

  async function screenshotDOMElement(path = null, element, padding = 0) {
    if (!element) throw Error('Please provide a element.')

    const rect = await page.evaluate(element => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { left: x, top: y, width, height, id: element.id }
    }, element)

    if (!rect) throw Error(`Could not find element that matches.`)

    return await page.screenshot({
      path,
      type: imageType,
      clip: {
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      },
    })
  }

  await page.waitForFunction(imagesHaveLoaded, { timeout: 60000 })

  const genPath = filename => path.resolve(__dirname, 'itemImages/', `${filename}.${imageType}`)
  const items = await page.$$('div.flash-sale-item-card')
  await console.log('itemsCount: ', items.length)

  await items.map(
    async (element, index) =>
      await screenshotDOMElement(genPath(index + 1), element).catch(error => console.error(error))
  )
  await console.log('=== BEFORE ===')
  // await browser.close()
  await console.log('=== CLOSED ===')
}

init()
