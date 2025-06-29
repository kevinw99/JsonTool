import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to handle JSON file saving
const jsonSavePlugin = () => {
  return {
    name: 'json-save',
    configureServer(server: any) {
      server.middlewares.use('/api/save-samples', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') {
          return next()
        }

        let body = ''
        req.on('data', (chunk: any) => {
          body += chunk.toString()
        })

        req.on('end', () => {
          try {
            const { file1, file2, filename1, filename2 } = JSON.parse(body)
            
            if (!file1 || !file2) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Both file1 and file2 are required' }))
              return
            }

            // Use provided filenames or fallback to default names
            const file1Name = filename1 || 'sample1.json'
            const file2Name = filename2 || 'sample2.json'

            // Ensure filenames have .json extension
            const ensureJsonExtension = (filename: any) => {
              return filename.endsWith('.json') ? filename : `${filename}.json`
            }

            const finalFile1Name = ensureJsonExtension(file1Name)
            const finalFile2Name = ensureJsonExtension(file2Name)

            const publicDir = path.join(process.cwd(), 'public')
            
            // Ensure public directory exists
            if (!fs.existsSync(publicDir)) {
              fs.mkdirSync(publicDir, { recursive: true })
            }

            // Save files with actual filenames
            const file1Path = path.join(publicDir, finalFile1Name)
            fs.writeFileSync(file1Path, JSON.stringify(file1, null, 2))
            
            const file2Path = path.join(publicDir, finalFile2Name)
            fs.writeFileSync(file2Path, JSON.stringify(file2, null, 2))
            
            console.log(`Saved ${finalFile1Name} and ${finalFile2Name} to public directory`)
            
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Files saved successfully',
              files: [finalFile1Name, finalFile2Name]
            }))
            
          } catch (error: unknown) {
            console.error('Error saving files:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ 
              error: 'Failed to save files', 
              details: error instanceof Error ? error.message : 'Unknown error' 
            }))
          }
        })
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), jsonSavePlugin()],
})
