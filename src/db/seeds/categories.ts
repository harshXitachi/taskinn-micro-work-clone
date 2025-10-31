import { db } from '@/db';
import { categories } from '@/db/schema';

async function main() {
    const sampleCategories = [
        {
            name: 'Data Entry',
            description: 'Enter data from images or documents into spreadsheets',
            icon: 'database',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Surveys',
            description: 'Complete surveys and questionnaires',
            icon: 'clipboard-list',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Content Moderation',
            description: 'Review and moderate user-generated content',
            icon: 'shield-check',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Image Tagging',
            description: 'Tag and categorize images with relevant keywords',
            icon: 'tag',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Transcription',
            description: 'Transcribe audio or video files to text',
            icon: 'file-text',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Translation',
            description: 'Translate text between different languages',
            icon: 'languages',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Product Research',
            description: 'Research products and compile data',
            icon: 'search',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Social Media Tasks',
            description: 'Like, share, comment on social media posts',
            icon: 'share-2',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Web Scraping',
            description: 'Extract data from websites and online sources',
            icon: 'globe',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'App Testing',
            description: 'Test mobile and web applications for bugs',
            icon: 'smartphone',
            createdAt: new Date().toISOString(),
        }
    ];

    await db.insert(categories).values(sampleCategories);
    
    console.log('✅ Categories seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});