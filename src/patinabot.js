const eris = require('eris');
const https = require("https");
const bot = new eris.Client(process.env.DISCORD_KEY);
const sdk = require('node-appwrite');

const client = new sdk.Client();
const database = new sdk.Database(client);
const storage = new sdk.Storage(client);
client
    .setEndpoint(process.env.APPWRITE_API) // Your API Endpoint
    .setProject('61e09cfd531bb77b9ce0') // Your project ID
    .setKey(process.env.APPWRITE_API_KEY)
    .setSelfSigned()
    // Your secret API key
    ;

bot.on('ready', () => {
    console.log('Connected and ready.');
});

bot.on('messageCreate', async (msg) => {
    const botWasMentioned = msg.mentions.find(
        mentionedUser => mentionedUser.id === bot.user.id,
    );

    if (botWasMentioned && msg.content.includes("!save")) {
        return await handleSave(msg);
    }
    if (botWasMentioned && msg.content.includes("!send")) {
        return await handleSend(msg);
    }
    if (botWasMentioned && msg.content.includes("!myId")) {
        return await handleMyId(msg);
    }
});

bot.on('error', err => {
    console.warn(err);
});

bot.connect();

async function handleMyId(msg){
    let dm = await msg.author.getDMChannel();
    dm.createMessage(msg.author.id);
}

async function handleSave(msg) {
    msgParsed = msg.content.split(" ")
    if (msgParsed.indexOf("!save") + 1 >= msgParsed.length) {
        msg.channel.createMessage("You gotta name your image!")
        return
    }
    let user;
    let { documents, sum } = await database.listDocuments("user", [sdk.Query.equal("user_id", msg.author.id)]);
    if (sum === 0) {
        user = await database.createDocument('user', 'unique()',
            {
                "user_id": msg.author.id,
                "user_name": msg.author.username,
                "user_memes": []
            });
    }
    else {
        if (documents.length != 1) {
            msg.channel.createMessage("We found multiple users with the same ID... Nani? We can't save your meme!")
        }
        user = documents[0]
    }


    fileName = msgParsed[msgParsed.indexOf("!save") + 1]
    fileName = (fileName.length > 35) ? fileName.substring[0,75] + '..' : fileName;
    meme_id = msg.author.id + msg.author.username + fileName
    if (msg.attachments.length !== 1) {
        msg.channel.createMessage("One at a time boi")
        return
    }
    if (msg.attachments.length < 1) {
        msg.channel.createMessage("Where your meme at?")
        return
    }
    if (msg.attachments.length > 1) {
        msg.channel.createMessage("One at a time boi")
        return
    }
    const meme_file_metadata = msg.attachments[0]
    if (meme_file_metadata.content_type.split('/')[0] !== "image") {
        msg.channel.createMessage("Since when did we have non-image memes???")
        return
    }

    https.get(meme_file_metadata.url, async (res) => {
        await storage.createFile(meme_id, res, ["user:" + msg.author.id]);
    }).on('error', (err) => {
        msg.channel.createMessage("Save failed :< The shelves are not working")
    });

    database.updateDocument('user', user['$id'],
        { user_memes: user.user_memes.concat([fileName]) })

    await database.createDocument('memedex', 'unique()',
        {
            "user_id": msg.author.id,
            "meme_file_id": meme_id,
            "meme_name": fileName
        });

    msg.channel.createMessage("Saved " + fileName)
}

async function handleSend(msg) {
    
    msgParsed = msg.content.split(" ")
    if (msgParsed.indexOf("!send") + 1 >= msgParsed.length) {
        msg.channel.createMessage("Where the name at?")
        return
    }
    memeName = msgParsed[msgParsed.indexOf("!send") + 1]

    let { documents, sum } = await database.listDocuments("memedex", [sdk.Query.equal("user_id", msg.author.id), sdk.Query.equal("meme_name", memeName)]);

    if (documents.length < 1) {
        msg.channel.createMessage("Wut? never heard of dat boi");

    }

    let file_meta = await storage.getFile(documents[0]["meme_file_id"]);
    let file = await storage.getFileView(documents[0]["meme_file_id"]);
    msg.channel.createMessage(memeName, {file: file, name: file_meta["name"]});
}