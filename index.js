const fs = require('fs').promises;
const http = require('http');
const { Command } = require('commander');
const { Builder } = require('xml2js');

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'Server address')
  .requiredOption('-p, --port <port>', 'Server port', parseInt)
  .requiredOption('-i, --input <path>', 'Path to input file')
  .parse(process.argv);

const options = program.opts();

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function convertJsonToXml(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);

    const xmlObj = {
      data: {
        exchange: jsonData.map(entry => ({
          date: entry.exchangedate,
          rate: entry.rate
        }))
      }
    };

    const builder = new Builder();
    return builder.buildObject(xmlObj);
  } catch (error) {
    console.error('Error reading or converting file:', error);
    return '<error>Invalid JSON file</error>';
  }
}

async function startServer() {
  if (!(await checkFileExists(options.input))) {
    console.error('Cannot find input file');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const xmlData = await convertJsonToXml(options.input);
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(xmlData);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/xml' });
      res.end('<error>Internal Server Error</error>');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}/`);
  });
}

startServer();
