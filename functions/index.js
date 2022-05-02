const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore()

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/* exports.joinGame = functions.firestore
    .document("/activeGame/{gameKey}/players/{playerUID}")
    .onCreate(async (snap, context) => {
        const gameKey = context.params.gameKey
        const gameSnapshot = await db.doc("activeGame/" + gameKey).get()
        if (!gameSnapshot.exists) {
            return snap.ref.set({
                invalid: true,
            })
        }
        const gameData = gameSnapshot.data()
        functions.logger.log("GAMEDATA")
        functions.logger.log(gameData)
        let words = []
        for (let i = 0; i < gameData.crosswordData.length; i++) {
            words.push(gameData.crosswordData[i].word.word)
        }
        return snap.ref.set({ words: words }, { merge: true })
    }) */
exports.newGuess = functions.firestore
    .document("activeGame/{gameKey}/players/{playerUID}")
    .onUpdate(async (change, context) => {
        if (await (await db.doc(`activeGame/${context.params.gameKey}/players/invis`).get()).data().gameStarted) {
            const old = change.before.data().pastGuesses
            const recent = change.after.data().pastGuesses
            if (old.length !== recent.length) {
                let guessed = change.before.data().guessed
                let guess = recent.filter(x => !old.includes(x))
                if (guess.length !== 1) {
                    return
                }
                let crosswordData = await (await db.doc(`activeGame/${context.params.gameKey}`).get()).data().crosswordData
                crosswordData.forEach(idx => {
                    if (idx.word.word.toLowerCase() === guess[0].toLowerCase().replace(" ", "-")) {
                        console.log("Correct guess")
                        guessed.push(idx)
                    }
                })
                return change.after.ref.set({
                    guessed: guessed
                }, { merge: true })
            } return;
        } return;
    })

exports.createCrossword = functions.firestore
    .document("/teachers/{teacherId}/games/{gameId}")
    .onWrite((change, context) => {
        //If document.after doesnt exist, then Document is being deleted and doesnt need a new Crossword
        if (!change.after.exists) {
            return
        }
        //Only Change if user Requested, not because of Crossword Generation (Crosswordgeneration Changes Document, which results in infinite Loop)
        if (change.after.data().change === false) {
            return
        }
        const data = change.after.data()

        //Get Words for the Crossword
        let crosswordWords = { words: [] }
        if (data.questions) {
            data.questions.forEach((element) => {
                crosswordWords.words.push(element.a)
            });
        }
        if (data.text) {
            let textElements = data.text.split("_")
            //for every second Element starting at 1: "[0]Bla blah _[1]word_[2] bla bla _[3]word_[4]."
            for (let i = 1; i < textElements.length; i += 2) {
                crosswordWords.words.push(textElements[i])
            }
        }

        //Generate Crossword
        let crossword = getStrongCrossword(15, 10, crosswordWords).wordPlacements
        //Return Promise because of Magical Reasons (https://firebase.google.com/docs/functions/firestore-events -> Schreiben von Daten)
        return change.after.ref.set({
            crossword: crossword,
            change: false,
        }, { merge: true })
    });









//------------------------------------------------
//Crossword Generation Functions
//------------------------------------------------

let printGrid = (grid, score) => {
    console.log("Score: " + score)
    for (let i = 0; i < grid.length; i++) {
        console.log(grid[i].join(" "));
    }
}

function getStrongCrossword(gridSize, invocations, input) {

    console.log("Creating crosswords...");
    input.words.sort((a, b) => {
        return b.length - a.length;
    });
    console.log("There are " + input.words.length + " words in the input file.");
    let words = [];
    input.words.forEach((word) => {
        words.push({ word: word.replace(/ /g, "-"), length: word.length });
    });

    console.log("Note that words above " + Number(gridSize - 2) + " characters will be deleted")
    words = words.filter((index) => index.word.length < gridSize - 2)
    console.log("There are " + words.length + " words left")

    if (words.length < 1) {
        console.log("There are no words left...")
        return 1
    }

    const getCrossword = () => {
        let pastWords = []
        let score = 0
        let wordPlacements = []

        const isFree = (newWord, coords) => {
            let x = coords[0];
            let y = coords[1];
            let direction = coords[2];
            let wordLength = newWord.length;
            if (direction === "across") {
                for (let i = 0; i < wordLength; i++) {
                    if (crossword[y][x + i] !== "." && crossword[y][x + i] !== newWord.charAt(i)) {
                        return false;
                    }
                }
            } else {
                for (let i = 0; i < wordLength; i++) {
                    if (crossword[y + i][x] !== "." && crossword[y + i][x] !== newWord.charAt(i)) {
                        return false;
                    }
                }
            }
            return true;
        }

        const placeWord = (wordIndex, coords) => {
            let x = coords[0];
            let y = coords[1];
            let direction = coords[2];
            let wordLength = words[wordIndex].word.length;
            let wordArray = words[wordIndex].word.split("");
            if (direction === "across") {
                for (let i = 0; i < wordLength; i++) {
                    crossword[y][x + i] = wordArray[i];
                }
                //FIX cuz of eslint (Siehe ERROR HELP LOG)
                Object.assign(words[wordIndex], { direction: "across", xPos: x, yPos: y })
                //OLD CODE (works but eslint doesnt like it):
                //words[wordIndex] = { ...words[wordIndex], direction: "across", xPos: x, yPos: y }
            } else {
                for (let i = 0; i < wordLength; i++) {
                    crossword[y + i][x] = wordArray[i];
                }
                //FIX cuz of eslint (Siehe ERROR HELP LOG)
                Object.assign(words[wordIndex], { direction: "down", xPos: x, yPos: y })
                //OLD CODE (works but eslint doesnt like it):
                //words[wordIndex] = { ...words[wordIndex], direction: "down", xPos: x, yPos: y }
            }

            let tempArr = pastWords
            for (let i = 0; i < words.length; i++) {
                if (wordIndex === i) {
                    tempArr.push(words[i])
                }
            }
            score++
            pastWords = tempArr
        }

        const findWord = () => {
            let matches = []
            for (let index = 0; index < pastWords.length; index++) {
                for (let i = 0; i < words.length; i++) {
                    for (let j = 0; j < pastWords[index].word.length; j++) {
                        if (!pastWords.includes(words[i])) {
                            let pos = words[i].word.search(pastWords[index].word.charAt(j))
                            if (pos > -1) {
                                if (pastWords[index].direction == "across") {
                                    if (pastWords[index].yPos + words[i].word.length - 1 - pos > gridSize - 1 || pastWords[index].yPos - pos < 0) {
                                    } else {
                                        if (isFree(words[i].word, [pastWords[index].xPos + j, pastWords[index].yPos - pos, "down"])) {
                                            matches.push({ word: words[i].word, newWordIndex: i, posNew: pos, posInit: j, letter: pastWords[index].word.charAt(j), wordIndex: index })
                                        }
                                    }
                                } else {
                                    if (pastWords[index].xPos + words[i].word.length - 1 - pos > gridSize - 1 || pastWords[index].xPos - pos < 0) {
                                    } else {
                                        if (isFree(words[i].word, [pastWords[index].xPos - pos, pastWords[index].yPos + j, "across"])) {
                                            matches.push({ word: words[i].word, newWordIndex: i, posNew: pos, posInit: j, letter: pastWords[index].word.charAt(j), wordIndex: index })
                                        }
                                    }

                                }
                            }
                        }
                    }
                }
            }
            return matches[Math.floor(Math.random() * matches.length)]
        }

        const findAndPlace = () => {
            let find = findWord()
            if (find === undefined) {
                return true
            }
            if (pastWords[find.wordIndex].direction == "across") {
                wordPlacements.push({ word: { word: words[find.newWordIndex].word, length: words[find.newWordIndex].length }, pos: { x: find.posInit + pastWords[find.wordIndex].xPos, y: pastWords[find.wordIndex].yPos - find.posNew, dir: "down" } })
                placeWord(find.newWordIndex, [find.posInit + pastWords[find.wordIndex].xPos, pastWords[find.wordIndex].yPos - find.posNew, "down"])
            } else {
                wordPlacements.push({ word: { word: words[find.newWordIndex].word, length: words[find.newWordIndex].length }, pos: { x: pastWords[find.wordIndex].xPos - find.posNew, y: pastWords[find.wordIndex].yPos + find.posInit, dir: "across" } })
                placeWord(find.newWordIndex, [pastWords[find.wordIndex].xPos - find.posNew, pastWords[find.wordIndex].yPos + find.posInit, "across"])
            }
            return false
        }
        let crossword = Array(gridSize)
        const buildCrossword = () => {
            for (let i = 0; i < crossword.length; i++) {
                crossword[i] = Array(gridSize)
                for (let j = 0; j < crossword[i].length; j++) {
                    crossword[i][j] = ".";
                }
            }
            wordPlacements.push({ word: { word: words[0].word, length: words[0].length }, pos: { x: Math.floor(gridSize / 2) - Math.floor(words[0].length / 2), y: Math.ceil(gridSize / 2), dir: "across" } })
            placeWord(0, [Math.floor(gridSize / 2) - Math.floor(words[0].length / 2), Math.ceil(gridSize / 2), "across"]);
            let exit = false
            while (!exit) {
                exit = findAndPlace()
            }
            return { crossword: crossword, score: score, wordPlacements: wordPlacements }
        }
        return buildCrossword()
    }

    const quicksort = (crosswords) => {
        if (crosswords.length <= 1) {
            return crosswords;
        }

        let pivot = crosswords[0];
        let left = [];
        let right = [];

        for (let i = 1; i < crosswords.length; i++) {
            crosswords[i].score > pivot.score ? left.push(crosswords[i]) : right.push(crosswords[i]);
        }
        return quicksort(left).concat(pivot, quicksort(right));
    };

    const getBestCrossword = (amount) => {
        let crosswordCollection = Array(amount)
        for (let i = 0; i < amount; i++) {
            crosswordCollection[i] = getCrossword()
        }

        crosswordCollection = quicksort(crosswordCollection)
        printGrid(crosswordCollection[0].crossword, crosswordCollection[0].score)
        console.log(crosswordCollection[0])
        return crosswordCollection[0]
    }

    return getBestCrossword(invocations)
}

