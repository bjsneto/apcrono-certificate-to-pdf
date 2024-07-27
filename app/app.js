const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate-pdf', async (req, res) => {
  const { entry } = req.body;
  if (!entry) {
    return res.status(400).send('Entry is missing in the request body');
  }
  
  var certificate = entry.raceStreet ? "Certificado_Apcrono_Rua.html" : "Certificado_Apcrono_Bike.html";
  const templatePath = path.join(__dirname, 'templates', certificate);

  let template = '';
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error('Error reading HTML template:', error);
    return res.status(500).send('Error reading HTML template');
  }

  const filledTemplate = entry.raceStreet === true ?  applyTemplateValuesRaceStreet(template, entry) : applyTemplateValuesBike(template, entry);

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(filledTemplate, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

function applyTemplateValuesBike(template, entry) {
  return template
    .replace('{{NomeAtleta}}', entry.FirstName)
    .replace('{{title}}', entry.FirstName)
    .replace('{{DataEvento}}', entry.formattedRaceDate)
    .replace('{{EventName}}', entry.raceNameText)
    .replace('{{TempoBruto}}', entry.rawTime)
    .replace('{{Km/h}}', entry.speed)
    .replace('{{Pos}}', entry.position)
    .replace('{{EventCategory}}', entry.catName)
    .replace('{{Distância}}', entry.raceDistance + 'km');
}

function applyTemplateValuesRaceStreet(template, entry) {
  return template
    .replace('{{NomeAtleta}}', entry.FirstName)
    .replace('{{title}}', entry.FirstName)
    .replace('{{DataEvento}}', entry.formattedRaceDate)
    .replace('{{EventName}}', entry.raceNameText)
    .replace('{{TempoBruto}}', entry.rawTime)
    .replace('{{TempoLiquido}}', entry.liquidTime)
    .replace('{{Pos}}', entry.position)
    .replace('{{Min/km}}', entry.speedToPace)
    .replace('{{EventCategory}}', entry.catName)
    .replace('{{Distância}}', entry.raceDistance + 'km');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
