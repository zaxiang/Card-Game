import { MongoClient } from 'mongodb'
import { Config } from './model'

// Connection URL
const url = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(url)

async function main() {
    await client.connect()
    console.log('Connected successfully to MongoDB')
    
    const db = client.db("final_project")

    // Set up unique index for the gameConfiguration collection
    await db.collection("gameConfiguration").createIndex({ configurationId: 1 }, { unique: true });

    
    let defaultGameConfig: Config = {
        configurationId: "default", // Ensure configurationId is provided,
        numberOfDecks: 5,
        rankLimit: 13,
        suitLimit: 4,
        wildCard: "Q",
    };
    
    await db.collection("gameConfiguration").insertOne(defaultGameConfig);
    console.log("Default game configuration inserted.");

  process.exit(0)
}

main()
