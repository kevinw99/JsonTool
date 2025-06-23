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
    const { file1, file2 } = req.body;
    
    if (!file1 || !file2) {
      return res.status(400).json({ error: 'Both file1 and file2 are required' });
    }

    const publicDir = path.join(__dirname, 'public');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Save file1 as sample1.json
    const sample1Path = path.join(publicDir, 'sample1.json');
    fs.writeFileSync(sample1Path, JSON.stringify(file1, null, 2));
    
    // Save file2 as sample2.json
    const sample2Path = path.join(publicDir, 'sample2.json');
    fs.writeFileSync(sample2Path, JSON.stringify(file2, null, 2));
    
    console.log('Saved sample1.json and sample2.json to public directory');
    
    res.json({ 
      success: true, 
      message: 'Sample files saved successfully',
      files: ['sample1.json', 'sample2.json']
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
