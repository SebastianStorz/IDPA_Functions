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
        return crosswordCollection[0]
    }

    return getBestCrossword(invocations)
}

let printGrid = (grid, score) => {
    console.log("Score: " + score)
    for (let i = 0; i < grid.length; i++) {
        console.log(grid[i].join(" "));
    }
}

console.log(getStrongCrossword(20, 10, {
    "words": [
        "tiger",
        "bird",
        "banana",
        "laptop",
        "java code",
        "principal",
        "student",
        "watch",
        "mouse",
        "keyboard",
        "teacher",
        "water",
        "mantle",
        "pencil",
        "sneakers",
        "socks",
        "hydration",
        "water bottles",
        "backpack",
        "united states of america"
    ]
}).wordPlacements)