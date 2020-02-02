const express = require('express');
const LanguageService = require('./language-service');
const { requireAuth } = require('../middleware/jwt-auth');
const jsonBodyParser = express.json();
const languageRouter = express.Router();
const llMaker = require('../helpers/LinkListMaker');
const llHelpers = require('../helpers/LinkListHelpers');

function updateNexts(ll, llprevHeadValue) {
	let updatedWords = [];
	let prevNode = llHelpers.findPrevious(ll, llprevHeadValue);
	let updatedPrevNode = prevNode;

	updatedPrevNode.value.next = llprevHeadValue.id;
	updatedWords.push(updatedPrevNode.value);
	let currNode = ll.find(llprevHeadValue);
	let updatedCurrNode = currNode;
	if (!currNode.next) {
		updatedCurrNode.value.next = null;
	} else {
		updatedCurrNode.value.next = currNode.next.value.id;
	}
	updatedWords.push(updatedCurrNode.value);
	return updatedWords;
}

languageRouter
  .use(requireAuth)
  .use(async (req, res, next) => {
    try {
      /*
       use the user id to get language from db
       */
      const language = await LanguageService.getUsersLanguage(
        req.app.get('db'),
        req.user.id,
      )

      if (!language)
        return res.status(404).json({
          error: `You don't have any languages`,
        })

      req.language = language
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .get('/', async (req, res, next) => {
    try {
      /*
        use language id to get words
       */
      const words = await LanguageService.getLanguageWords(
        req.app.get('db'),
        req.language.id,
      )

      res.json({
        language: req.language,
        words,
      })
      next()
    } catch (error) {
      next(error)
    }
  })
// GET request handler for rendering each learning page at 'api/language/head'
languageRouter
  .use(requireAuth)
  .get('/head', async (req, res, next) => {
    // implement me
    try {
      let languageHead = await LanguageService.getLanguageHead(
        req.app.get('db'),
        req.user.id
      );
      languageHead = languageHead[0].head;
      let head = await LanguageService.getHead(req.app.get('db'), languageHead);
      head = head[0];
      res.json({
        nextWord: head.original,
        totalScore: head.total_score,
        wordCorrectCount: head.correct_count,
        wordIncorrectCount: head.incorrect_count,
        
      });
      next();
    } catch (error) {
      next(error);
    }
  })

languageRouter
.use(requireAuth)
.post('/guess', jsonBodyParser, async (req, res, next) => {
  try {
    const { guess } = req.body;
    const words = await LanguageService.getLanguageWords(
      req.app.get('db'),
      req.language.id
    );
    let languageHead = await LanguageService.getLanguageHead(
      req.app.get('db'),
      req.user.id
    );
    // languageHead is language.head, an integer referring to a word.id
    languageHead = languageHead[0].head;
    let head = await LanguageService.getHead(req.app.get('db'), languageHead);
    // head is the node, which will be ll.head in the word LL
    head = head[0];

    let ll = llMaker(words, head);

    if (!guess) {
      res.status(400).json({ error: `Missing 'guess' in request body` });
    } else {
      let total_score = head.total_score;
      let correct_count = head.correct_count;
      let incorrect_count = head.incorrect_count;
      let translation = head.translation;
      let memory_value = head.memory_value;
      let CORRECT = guess === translation;

      if (CORRECT) {
        correct_count++;
        total_score++;
        memory_value *= 2;
      } else {
        incorrect_count++;
        memory_value = 1;
      }

      Object.assign(ll.head.value, {
        correct_count,
        incorrect_count,
        memory_value
      });

      let llprevHeadValue = ll.head.value;
      ll.remove(ll.head);
      let llLength = llHelpers.size(ll);
      let updatedLanguageWords;
      if (llprevHeadValue.memory_value < llLength) {
        ll.insertAt(llprevHeadValue.memory_value, llprevHeadValue);
        updatedLanguageWords = updateNexts(ll, llprevHeadValue);
      } else if (llprevHeadValue.memory_value >= llLength) {
        ll.insertLast(llprevHeadValue);
        updatedLanguageWords = updateNexts(ll, llprevHeadValue);
      }

      // persist the updated word order
      updatedLanguageWords.forEach(async wordObj => {
        let wordObjUpdate = {
          correct_count: wordObj.correct_count,
          incorrect_count: wordObj.incorrect_count,
          next: wordObj.next,
          memory_value: wordObj.memory_value
        };
        await LanguageService.updateLanguageWords(
          req.app.get('db'),
          wordObj.id,
          wordObjUpdate
        );
      });

      // Persist new head and score => db(language)
      let updatedLanguage = {
        total_score: total_score,
        head: ll.head.value.id
      };

      await LanguageService.updateLanguage(
        req.app.get('db'),
        req.user.id,
        updatedLanguage
      );

      // send correct/incorrect response
      if (CORRECT) {
        res.status(200).json({
          nextWord: ll.head.value.original,
          totalScore: total_score,
          wordCorrectCount: ll.head.value.correct_count,
          wordIncorrectCount: ll.head.value.incorrect_count,
          answer: translation,
          isCorrect: true
        });
      } else {
        res.status(200).json({
          nextWord: ll.head.value.original,
          totalScore: total_score,
          wordCorrectCount: ll.head.value.correct_count,
          wordIncorrectCount: ll.head.value.incorrect_count,
          answer: translation,
          isCorrect: false
        });
      }
      next();
    }
  } catch (error) {
    next(error);
  }
  })

module.exports = languageRouter
