const express = require('express');
const publicController = require('../controllers/public.controller');
const {
  listPapersValidators,
  idValidators,
  limitValidators,
} = require('../validators/public.validators');

const router = express.Router();

router.get('/site-config', publicController.getSiteConfig);
router.get('/home', publicController.getHome);
router.get('/stats', publicController.getStats);
router.get('/taxonomy', publicController.getTaxonomy);
router.get('/papers/latest', limitValidators, publicController.latestPapers);
router.get('/papers/popular', limitValidators, publicController.popularPapers);
router.get('/papers', listPapersValidators, publicController.listPapers);
router.get('/papers/:id', idValidators, publicController.getPaper);
router.get('/papers/:id/view', idValidators, publicController.viewPaper);
router.get('/papers/:id/download', idValidators, publicController.downloadPaper);

module.exports = router;
