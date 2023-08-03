const axios = require('axios')
const express = require('express')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')


const app = express();
const baseUrl = `https://mangareader.to/home`
const baseUrl2 = `https://mangareader.to`
const baseUrl3 = `https://mangareader.to/read/`
async function checkElementsLoaded() {
    const browser = await puppeteer.launch({ headless: 'new' }); // Set 'headless' to false for debugging purposes
    const page = await browser.newPage();
    return page.evaluate(() => {
      const elements = document.querySelectorAll('.container .container-reader-chapter img');
      return elements.length;
    });
  }

app.get('/recommended', async (req, res) => {
    try {
        const response = await axios.get(`${baseUrl}`)
        const data = response.data
        const $ = cheerio.load(data)
        const manList = []

        $('.swiper-slide').each((index, element) => {
            const $el = $(element)
            const $imgElement = $el.find('.mg-item-basic .manga-poster img')
            let imgLink = $imgElement.attr('src')

            const $animeTitle = $el.find('.mg-item-basic .manga-detail .manga-name')
            let title = $animeTitle.text().trim()
            if (!title) {
                title = $animeTitle.attr('title')
            }

            const $id = $animeTitle.find('a')
            const idElement = $id.attr('href')
            const $tags = $el.find('.mg-item-basic .manga-detail .fd-infor a')
            let tags = $tags.text().trim()
            const $link = baseUrl2+idElement

            // Check if both mangaTitle and tags are not empty before pushing
            if (title && tags) {
                const mangaStuff = {
                    'mangaTitle': title,
                    'id': idElement,
                    'imgUrl': imgLink,
                    'tags': tags,
                    'LinkToMain': $link
                }
                
                manList.push(mangaStuff)
            }
        })
        res.json({ 'Manga': manList });
    } catch (error) {
        console.error(error)
    }
})

app.get('/details/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const response = await axios.get(`${baseUrl2}/${id}`)
        const data = response.data;
        const $ = cheerio.load(data)
        const details = []

        $('.anis-content').each((index, element) => {
            const $el = $(element)
            const $title = $el.find('.anisc-detail .manga-name')
            const title = $title.text().trim()
            const $japTitle = $el.find('.manga-name-or')
            const japTitle = $japTitle.text().trim()
            const $imgEl = $el.find('.anisc-poster .manga-poster img')
            let imgLink = $imgEl.attr('src')
            const $readLink = $el.find('.anisc-detail .manga-buttons a')
            const readLink = $readLink.attr('href')
            const $desc = $el.find('.anisc-detail .sort-desc .description')
            const description = $desc.text().trim()
            const $vols = $('.volume-list-ul #en-volumes .item')
            const NoOfVol = $vols.length
            const volumes = [];
            $('.volume-list-ul #en-volumes .item').each((volIndex, volElement) => {
                const $volEl = $(volElement);
                const $volImg = $volEl.find('.manga-poster img');
                const volImgLink = $volImg.attr('src');
                const $link = $volEl.find('.manga-poster a');
                const $$link = $link.attr('href');
                const link = baseUrl2 + $$link;
                const spec = $volImg.attr('alt');

                volumes.push({
                    'VolumeImg': volImgLink,
                    'VolumeLink': link,
                    'Volume Number': spec
                });
            });

            // Separate tags into an array
            const $tags = $el.find('.anisc-detail .sort-desc .genres a')
            const tags = $tags.map((index, element) => $(element).text().trim()).get()

            const detailStuff = {
                'title': title,
                'japTitle': japTitle,
                'Img': imgLink,
                'mainLinkToRead': readLink,
                'Description': description,
                'Genres': tags,
                'Number Of Volumes': NoOfVol,
                'Volumes': volumes
            }
            details.push(detailStuff)
        })
        
        res.json({ 'Manga': details })
    } catch (error) {
        console.error(error)
    }
})



app.get('/read/:id/en/:volNo', async (req, res) => {
    const id = req.params.id;
    const volNo = req.params.volNo;
    const main = `${baseUrl3}${id}/en/${volNo}`;
  
    try {
      const browser = await puppeteer.launch({ headless: 'new' }); // Set 'headless' to false for debugging purposes
      const page = await browser.newPage();
  
      // Navigate to the main URL and wait for the page to load
      await page.goto(main, { waitUntil: 'load' });
  
      // Wait for the "Vertical Follow" button to appear on the page (you may need to adjust the selector)
      await page.waitForSelector('.rtl-row.mode-item[data-value="vertical"]');
  
      // Click the "Vertical Follow" button
      await page.evaluate(() => {
        const verticalFollowButton = document.querySelector('.rtl-row.mode-item[data-value="vertical"]');
        if (verticalFollowButton) {
          verticalFollowButton.click();
        }
      });
  
      // Function to check if the elements with the specified class have loaded
  
      // Wait for the elements with the specified class to be loaded
      await page.waitForFunction(checkElementsLoaded);
  
      // Get the page content after the JavaScript has been executed
      const data = await page.content();
      const $ = cheerio.load(data);
  
      // Using response.write to send each image link back to the client as it's being processed
      res.write('Manga: \n');
  
      $('.container .container-reader-chapter').each((index, element) => {
        const $el = $(element);
        const $imageLink = $el.find('img');
        const imgLink = $imageLink.attr('src');
  
        // Log the image link to the console
        console.log('Image Link:', imgLink);
  
        // Send the image link to the client
        res.write(JSON.stringify(imgLink + '\n'));
      });
  
      // End the response after all images have been processed
      res.end();
  
      // Close Puppeteer browser once done
      await browser.close();
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred.');
    }
  });
  

const port = 3000
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

