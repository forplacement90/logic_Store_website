require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const mainRouter = require("./routes/main.router");
const geminiRouter = require("./routes/geminiRouter");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const { initRepo } = require("./controllers/init");
const { addRepo } = require("./controllers/add");
const { commitRepo } = require("./controllers/commit");
const { pushRepo } = require("./controllers/push");
const { pullRepo } = require("./controllers/pull");
const { revertRepo } = require("./controllers/revert");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());

const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB connected!"))
    .catch(err => console.error("MongoDB connection error:", err));

app.use("/", mainRouter);
app.use("/api", geminiRouter);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
    socket.on("joinRoom", (userID) => {
        console.log(`User joined: ${userID}`);
        socket.join(userID);
    });
});

httpServer.listen(port, () => {
    console.log(`Server is running on PORT ${port}`);
});

yargs(hideBin(process.argv))
    .command("start", "Starts a new server", {}, () => console.log("Server already running"))
    .command("init", "Initialise a new repository", {}, initRepo)
    .command("add <file>", "Add a file to the repository", (yargs) => {
        yargs.positional("file", {
            describe: "File to add to the staging area",
            type: "string",
        });
    }, (argv) => {
        addRepo(argv.file);
    })
    .command("commit <message>", "Commit the staged files", (yargs) => {
        yargs.positional("message", {
            describe: "Commit message",
            type: "string",
        });
    }, (argv) => {
        commitRepo(argv.message);
    })
    .command("push", "Push commits to S3", {}, pushRepo)
    .command("pull", "Pull commits from S3", {}, pullRepo)
    .command("revert <commitID>", "Revert to a specific commit", (yargs) => {
        yargs.positional("commitID", {
            describe: "Commit ID to revert to",
            type: "string",
        });
    }, (argv) => {
        revertRepo(argv.commitID);
    })
    .demandCommand(1, "You need at least one command")
    .help().argv;




