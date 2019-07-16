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
const viewSetting = { width: 1920, height: 1080 }

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
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file) {
      var curPath = path + '/' + file
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

const finish = async browser => await browser.close()

const init = async () => {
  // Manage directory
  await removeFolder(directoryPath)
  await createFolder(directoryPath)

  const browser = await puppeteer.launch({
    headless: false,
    args: [`--window-size=${viewSetting.width},${viewSetting.height}`],
  })
  const page = await browser.newPage()
  await page.setViewport(viewSetting)
  await page.goto(url, { waitUntil: 'networkidle0' })

  // Remove some elements
  await page.evaluate(
    selectors => {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(element => element.parentNode.removeChild(element))
      })
    },
    ['.flash-sale-banner', '.flash-sale-session-picker']
  )

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

  let counter = 0
  await items.map(
    async (element, index) =>
      await screenshotDOMElement(genPath(index + 1), element)
        .then(() => {
          if (counter === items.length - 1) {
            finish(browser)
          }
          counter += 1
        })
        .catch(error => console.error(error))
  )
}

init()
