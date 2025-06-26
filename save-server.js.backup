import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/save-samples', (req, res) => {
  try {
    const { file1, file2, filename1, filename2 } = req.body;
    
    if (!file1 || !file2) {
      return res.status(400).json({ error: 'Both file1 and file2 are required' });
    }

    // Use provided filenames or fallback to default names
    const file1Name = filename1 || 'sample1.json';
    const file2Name = filename2 || 'sample2.json';

    // Ensure filenames have .json extension
    const ensureJsonExtension = (filename) => {
      return filename.endsWith('.json') ? filename : `${filename}.json`;
    };

    const finalFile1Name = ensureJsonExtension(file1Name);
    const finalFile2Name = ensureJsonExtension(file2Name);

    const publicDir = path.join(__dirname, 'public');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Save files with actual filenames
    const file1Path = path.join(publicDir, finalFile1Name);
    fs.writeFileSync(file1Path, JSON.stringify(file1, null, 2));
    
    const file2Path = path.join(publicDir, finalFile2Name);
    fs.writeFileSync(file2Path, JSON.stringify(file2, null, 2));
    
    console.log(`Saved ${finalFile1Name} and ${finalFile2Name} to public directory`);
    
    res.json({ 
      success: true, 
      message: 'Files saved successfully',
      files: [finalFile1Name, finalFile2Name]
    });
    
  } catch (error) {
    console.error('Error saving files:', error);
    res.status(500).json({ 
      error: 'Failed to save files', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Save API server running on http://localhost:${PORT}`);
});
