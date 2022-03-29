export {calculateScores}
let subscaleScores = 
{
    "con": {
        "min": 7.5,
        "male": [ 43, 45, 48, 51, 54, 57, 59, 62, 65, 68, 70, 73, 76, 79, 81, 84, 87, 90, 92, 95, 98, 101, 103, 106, 109 ],
        "female": [ 39, 41, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89 ]
    },
    "def": {
        "min": 7.5,
        "male": [ 19, 22, 24, 26, 29, 31, 33, 36, 38, 40, 43, 45, 48, 50, 52, 54, 57, 59, 61, 64, 66, 68, 71, 73, 76],
        "female": [ 29, 32, 34, 36, 38, 40, 42, 45, 47, 49, 51, 53, 55, 58, 60, 62, 64, 66, 68, 70, 73, 75, 77, 79, 81]
    },
    "moll": {
        "min": 7.5,
        "male": [ 38, 40, 43, 45, 48, 50, 53, 55, 58, 60, 63, 65, 68, 70, 73, 75, 78, 80, 83, 85, 88, 90, 93, 95, 98],
        "female": [ 37, 39, 42, 44, 46, 48, 50, 53, 55, 57, 60, 62, 64, 66, 68, 71, 73, 75, 77, 80, 82, 84, 86, 89, 91]
    },
    "cut": {
        "min": 7.5,
        "male": [ 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88],
        "female": [ 33, 34, 36, 38, 40, 42, 44, 46, 47, 49, 51, 53, 55, 56, 58, 60, 62, 64, 66, 68, 69, 71, 73, 75, 77]
    },
    "ent": {
        "min": 7.5,
        "male": [ 38, 41, 43, 46, 48, 51, 54, 56, 59, 61, 64, 66, 69, 72, 74, 77, 79, 82, 84, 87, 90, 92, 95, 97, 100],
        "female": [ 34, 37, 39, 42, 44, 47, 49, 52, 54, 57, 59, 62, 64, 67, 69, 72, 74, 77, 79, 82, 84, 87, 89, 92, 94]
    },
    "po": {
        "min": 7.5,
        "male": [ 39, 42, 44, 47, 50, 52, 55, 57, 60, 62, 65, 67, 70, 72, 75, 77, 80, 82, 85, 87, 90, 92, 95, 97, 100],
        "female": [ 37, 39, 41, 43, 45, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 81, 83, 85, 87]
    },
    "sent": {
        "min": 7.5,
        "male": [ 26, 29, 31, 34, 36, 39, 42, 44, 47, 49, 52, 55, 57, 60, 62, 65, 68, 70, 73, 75, 78, 81, 83, 86, 88],
        "female": [ 24, 27, 29, 32, 34, 37, 39, 42, 44, 46, 49, 51, 54, 56, 59, 61, 64, 66, 69, 71, 73, 76, 78, 81, 83]
    },
    "so": {
        "min": 7.5,
        "male": [ 34, 37, 39, 42, 44, 47, 49, 52, 54, 56, 59, 61, 64, 66, 69, 71, 74, 76, 79, 81, 84, 86, 88, 91, 93],
        "female": [ 31, 34, 36, 38, 40, 42, 44, 46, 48, 51, 53, 55, 57, 59, 61, 63, 65, 68, 70, 72, 74, 76, 78, 80, 82]
    },
    "ci": {
        "min": 7.5,
        "male": [ 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84],
        "female": [ 31, 33, 35, 37, 39, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 67, 69, 71, 73, 75, 77]
    },
    "disc": {
        "min": 7.5,
        "male": [ 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86],
        "female": [ 32, 34, 36, 38, 39, 41, 43, 45, 46, 48, 50, 52, 54, 55, 57, 59, 61, 62, 64, 66, 68, 70, 71, 73, 75]
    },
    "foc": {
        "min": 7.5,
        "male": [ 36, 38, 41, 43, 45, 47, 49, 51, 54, 56, 58, 60, 62, 64, 67, 69, 71, 73, 75, 78, 80, 82, 84, 86, 88],
        "female": [ 36, 37, 39, 41, 43, 45, 47, 49, 50, 52, 54, 56, 58, 60, 61, 63, 65, 67, 69, 71, 73, 74, 76, 78, 80]
    },
    "cur": {
        "min": 12.5,
        "male": [ 39, 40, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52, 54, 55, 56, 57, 59, 60, 61, 62, 63, 65, 66, 67, 68, 70, 71, 72, 73, 74, 76, 77, 78, 79, 80, 82, 83, 84, 85, 87],
        "female": [ 33, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 73, 74, 75, 76]
    },
    "hist": {
        "min": 11.5,
        "male": [ 39, 40, 41, 43, 44, 46, 47, 48, 50, 51, 53, 54, 55, 57, 58, 60, 61, 62, 64, 65, 67, 68, 70, 71, 72, 74, 75, 76, 78, 79, 81, 82, 83, 85, 86, 88, 89],
        "female": [ 33, 34, 36, 37, 38, 39, 41, 42, 43, 45, 46, 47, 48, 50, 51, 52, 54, 55, 56, 57, 59, 60, 61, 62, 64, 65, 66, 68, 69, 70, 72, 73, 74, 75, 77, 78, 79]
    },
    "prob": {
        "min": 9.5,
        "male": [ 40, 41, 43, 44, 46, 47, 49, 50, 52, 53, 55, 56, 58, 59, 61, 62, 64, 65, 67, 68, 70, 71, 73, 74, 75, 77, 79, 80, 82, 84, 85],
        "female": [ 34, 35, 36, 38, 39, 40, 42, 43, 44, 46, 47, 48, 50, 51, 52, 54, 55, 56, 58, 59, 61, 62, 63, 65, 66, 67, 69, 70, 71, 73, 74]
    },
    "inthost": {
        "min": 9.5,
        "male": [ 42, 45, 48, 51, 54, 57, 60, 64, 67, 70, 73, 76, 79, 82, 85, 88, 92, 95, 98, 101, 104, 107, 110, 114, 117, 120, 123, 126, 129, 132, 135],
        "female": [ 42, 44, 46, 49, 51, 53, 55, 57, 60, 62, 64, 66, 69, 71, 73, 75, 78, 80, 82, 84, 86, 89, 91, 93, 96, 98, 100, 102, 104, 107, 109]
    },
    "assert": {
        "min": 9.5,
        "male": [ 40, 42, 44, 45, 47, 49, 50, 52, 54, 55, 57, 58, 60, 62, 63, 65, 67, 68, 70, 72, 73, 75, 77, 78, 80, 82, 83, 85, 87, 88, 90],
        "female": [ 35, 37, 38, 40, 41, 43, 44, 46, 48, 49, 51, 52, 54, 55, 57, 59, 60, 62, 63, 65, 66, 68, 70, 71, 73, 74, 76, 77, 79, 81, 82]
    },
    "dnt": {
        "min": 9.5,
        "male": [ 25, 27, 29, 30, 32, 34, 36, 38, 40, 42, 44, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63, 64, 66, 68, 70, 72, 74, 76, 78, 80, 81],
        "female": [ 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 51, 53, 55, 57, 59, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81]
    },
    "pct": {
        "min": 31.5,
        "male": [ 35, 36, 36, 37, 38, 39, 39, 40, 41, 42, 42, 43, 44, 45, 45, 46, 47, 48, 48, 49, 50, 51, 51, 52, 53, 54, 54, 55, 56, 57, 57, 58, 59, 60, 60, 61, 62, 63, 63, 64, 65, 66, 66, 67, 68, 69, 69, 70, 71, 72, 72, 73, 74, 75, 76, 76, 77, 78, 78, 79, 80, 81, 82, 82, 83, 84, 84, 85, 86, 87, 88, 88, 89, 90, 91, 91, 92, 93, 94, 94, 95, 96, 97, 97, 98, 98, 100, 100, 101, 102, 103, 103, 104, 105, 106, 106, 107],
        "female": [ 36, 36, 37, 38, 38, 39, 40, 40, 41, 42, 42, 43, 44, 44, 45, 46, 46, 47, 48, 48, 49, 49, 50, 51, 52, 52, 53, 54, 54, 55, 56, 56, 57, 58, 58, 59, 60, 60, 61, 62, 63, 63, 64, 65, 65, 66, 67, 67, 68, 69, 69, 70, 71, 71, 72, 72, 73, 74, 75, 76, 76, 77, 78, 78, 79, 80, 80, 81, 82, 82, 83, 84, 84, 85, 86, 86, 87, 88, 88, 89, 90, 90, 91, 92, 92, 93, 94, 94, 95, 96, 96, 97, 98, 99, 99, 100, 101]
    },
    "rct": {
        "min": 23.5,
        "male": [ 37, 37, 38, 39, 40, 40, 41, 42, 43, 43, 44, 45, 46, 46, 47, 48, 48, 49, 50, 51, 51, 52, 53, 54, 54, 55, 56, 57, 57, 58, 59, 60, 60, 61, 62, 63, 63, 64, 65, 66, 66, 67, 68, 68, 69, 70, 71, 72, 72, 73, 74, 74, 75, 76, 77, 78, 78, 79, 80, 80, 81, 82, 83, 83, 84, 85, 86, 86, 87, 88, 89, 89, 90],
        "female": [ 27, 27, 28, 29, 29, 30, 31, 31, 32, 33, 33, 34, 35, 35, 36, 37, 37, 38, 39, 39, 40, 41, 41, 42, 43, 43, 44, 45, 45, 46, 47, 47, 48, 49, 49, 50, 51, 51, 52, 53, 53, 54, 55, 55, 56, 57, 57, 58, 59, 59, 60, 61, 61, 62, 63, 63, 64, 65, 65, 66, 67, 67, 68, 69, 69, 70, 71, 71, 72, 73, 73, 74, 75]
    },
    "gct": {
        "min": 55.5,
        "male": [ 34, 35, 35, 36, 36, 36, 37, 37, 38, 38, 38, 39, 39, 40, 40, 40, 41, 41, 42, 42, 43, 43, 43, 44, 44, 45, 45, 46, 46, 46, 47, 47, 48, 48, 48, 49, 49, 50, 50, 50, 51, 51, 52, 52, 52, 53, 53, 54, 54, 54, 55, 55, 56, 56, 56, 57, 57, 58, 58, 58, 59, 59, 60, 60, 60, 61, 61, 62, 62, 63, 63, 63, 64, 64, 65, 65, 66, 66, 66, 67, 67, 68, 68, 68, 69, 69, 70, 70, 70, 71, 71, 72, 72, 72, 73, 73, 74, 74, 74, 75, 75, 76, 76, 76, 77, 77, 78, 78, 79, 79, 79, 80, 80, 81, 81, 81, 82, 82, 83, 83, 84, 84, 84, 85, 85, 86, 86, 86, 87, 87, 88, 88, 88, 89, 89, 90, 90, 90, 91, 91, 92, 92, 92, 93, 93, 94, 94, 95, 95, 95, 96, 96, 97, 97, 97, 98, 98, 99, 99, 100, 100, 100, 101, 101, 102, 102, 102, 103, 103],
        "female": [ 29, 30, 30, 30, 31, 31, 31, 32, 32, 32, 33, 33, 34, 34, 34, 35, 35, 35, 36, 36, 36, 37, 37, 38, 38, 38, 39, 39, 40, 40, 40, 41, 41, 41, 42, 42, 42, 43, 43, 44, 44, 44, 45, 45, 45, 46, 46, 47, 47, 47, 48, 48, 48, 49, 49, 50, 50, 50, 51, 51, 51, 52, 52, 52, 53, 53, 54, 54, 54, 55, 55, 55, 56, 56, 56, 57, 57, 58, 58, 58, 59, 59, 60, 60, 60, 61, 61, 61, 62, 62, 62, 63, 63, 64, 64, 64, 65, 65, 65, 66, 66, 66, 67, 67, 68, 68, 68, 69, 69, 70, 70, 70, 71, 71, 71, 72, 72, 72, 73, 73, 74, 74, 74, 75, 75, 75, 76, 76, 76, 77, 77, 78, 78, 78, 79, 79, 80, 80, 80, 81, 81, 81, 82, 82, 82, 83, 83, 84, 84, 84, 85, 85, 85, 86, 86, 87, 87, 87, 88, 88, 88, 89, 89, 90, 90, 90, 91, 91, 91]
    }
}

function getScoreForPICTSSubscale(scores, sex){
    let calculatedScores = { "GCT": 0, 
        "PCT": scores["MOLL"] + scores['ENT'] + scores["PO"] + scores["SO"],
        "RCT":  scores["CUT"] + scores['CI'] + scores["DISC"]
    };
    calculatedScores['GCT'] = calculatedScores["RCT"] + calculatedScores["PCT"];

    for(let subscale of Object.keys(calculatedScores)){
        const scale = subscaleScores[subscale.toLowerCase()]
        calculatedScores[subscale] = scale[sex][Math.floor(calculatedScores[subscale] - scale.min)]
    }

    const subscales = Object.keys(scores);

    for(let subscale of subscales){
        const scale = subscaleScores[subscale.toLowerCase()]
        calculatedScores[subscale] = scale[sex][Math.floor(scores[subscale] - scale.min)]
    }
    
    return calculatedScores;
}

function getScoreForDHSSubscale(scores){
    let calculatedScores = {};
    for(let subscale of Object.keys(scores)){
        let score = scores[subscale];
        if(subscale == 'DEPRESSION'){
            calculatedScores[subscale] = score / 17;
        }
        else if(subscale == 'HOPELESSNESS'){
            calculatedScores[subscale] = score / 10;
        }
        else if(subscale == 'CSI'){
            calculatedScores[subscale] = score / 2;
        }
        else if(subscale == 'HIST'){
            calculatedScores[subscale] = score / 5;
        }
        else if(subscale == 'CUR'){
            calculatedScores[subscale] = score / 3;
        }
    }

    return calculatedScores;
}

function calculateScores(subscale, scores, sex){
    switch (subscale.toUpperCase()){
        case 'PICTS':
            return getScoreForPICTSSubscale(scores, sex);
        // case 'DHS':
        //     return getScoreForDHSSubscale(scores, sex);
        default:
            // no extra calculation needed. return
            return false;
    }
}