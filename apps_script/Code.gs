const DOC_ID = '<REPLACE_WITH_DOC_ID>';

const TAG_TO_SECTION = {
  todo: 'TODO',
  next: 'Next Actions',
  idea: 'Ideas',
  misc: 'Miscellany',
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing POST body');
    }

    var payload = JSON.parse(e.postData.contents);
    var type = payload && payload.type;
    var section = payload && payload.section;
    var text = payload && payload.text;
    var who = payload && payload.who;

    if (!type || String(type).trim() === '') {
      throw new Error('Missing required field: type');
    }
    if (!text || String(text).trim() === '') {
      throw new Error('Missing required field: text');
    }

    appendEntry(type, text, who, section);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function appendEntry(typeRaw, textRaw, who, sectionRaw) {
  var type = normalizeType_(typeRaw);
  var sectionTitle = resolveSectionTitle_(type, sectionRaw);
  var text = String(textRaw || '').trim();
  if (!text) {
    throw new Error('text is empty after trimming');
  }

  var whoSafe = String(who || 'LB').trim() || 'LB';
  var timestamp = formatNow_();
  var line = '- ' + timestamp + ' [' + whoSafe + ']: ' + text;

  ensureHeadingExists_(sectionTitle);
  var insertionPoint = findHeadingInsertionPoint_(sectionTitle);

  // Use Docs API checkbox bullets for true clickable checkboxes.
  if (insertChecklistWithDocsApi_(line, insertionPoint)) {
    return;
  }

  // Fallback if Docs API is unavailable/misconfigured.
  var doc = DocumentApp.openById(DOC_ID);
  var body = doc.getBody();
  var loc = findOrCreateH1Section_(body, sectionTitle);
  body.insertParagraph(loc.insertionIndex, '[ ] ' + line);
  doc.saveAndClose();
}

function resolveSectionTitle_(type, sectionRaw) {
  var section = String(sectionRaw || '').trim();
  if (section) {
    return section;
  }
  return TAG_TO_SECTION[type] || TAG_TO_SECTION.misc;
}

function normalizeType_(typeRaw) {
  var t = String(typeRaw || '').trim().toLowerCase();
  if (t.endsWith(':')) {
    t = t.slice(0, -1);
  }
  return t;
}

function findOrCreateH1Section_(body, sectionTitle) {
  for (var i = 0; i < body.getNumChildren(); i++) {
    var el = body.getChild(i);
    if (el.getType() !== DocumentApp.ElementType.PARAGRAPH) {
      continue;
    }

    var p = el.asParagraph();
    if (p.getHeading() === DocumentApp.ParagraphHeading.HEADING1 && p.getText() === sectionTitle) {
      return {
        headingIndex: i,
        insertionIndex: i + 1,
      };
    }
  }

  var heading = body.appendParagraph(sectionTitle);
  heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var headingIndex = body.getNumChildren() - 1;
  return {
    headingIndex: headingIndex,
    insertionIndex: headingIndex + 1,
  };
}

function ensureHeadingExists_(sectionTitle) {
  var doc = DocumentApp.openById(DOC_ID);
  var body = doc.getBody();
  findOrCreateH1Section_(body, sectionTitle);
  doc.saveAndClose();
}

function findHeadingInsertionPoint_(sectionTitle) {
  var docJson = Docs.Documents.get(DOC_ID);
  var content = (docJson && docJson.body && docJson.body.content) || [];
  var docEnd = getDocEndIndex_(content);

  for (var i = 0; i < content.length; i++) {
    var el = content[i];
    if (!el || !el.paragraph) {
      continue;
    }

    var style = el.paragraph.paragraphStyle || {};
    if (style.namedStyleType !== 'HEADING_1') {
      continue;
    }

    var headingText = extractParagraphText_(el).trim();
    if (headingText === sectionTitle) {
      var idx = Number(el.endIndex || 1);
      if (!isFinite(idx) || idx < 1) {
        idx = 1;
      }
      // Clamp to editable range in body.
      return Math.min(idx, docEnd);
    }
  }

  return docEnd;
}

function insertChecklistWithDocsApi_(line, insertionIndex) {
  try {
    var textToInsert = line + '\n';
    var start = Number(insertionIndex);
    if (!isFinite(start) || start < 1) {
      start = 1;
    }
    var end = start + textToInsert.length;

    Docs.Documents.batchUpdate(
      {
        requests: [
          {
            insertText: {
              location: { index: start },
              text: textToInsert,
            },
          },
          {
            createParagraphBullets: {
              range: { startIndex: start, endIndex: end },
              bulletPreset: 'BULLET_CHECKBOX',
            },
          },
        ],
      },
      DOC_ID
    );
    return true;
  } catch (err) {
    return false;
  }
}

function extractParagraphText_(contentElement) {
  var paragraph = contentElement.paragraph || {};
  var elements = paragraph.elements || [];
  var out = '';
  for (var i = 0; i < elements.length; i++) {
    var textRun = elements[i] && elements[i].textRun;
    if (textRun && textRun.content) {
      out += textRun.content;
    }
  }
  return out.replace(/\n$/, '');
}

function getDocEndIndex_(content) {
  var lastEnd = 1;
  for (var i = 0; i < content.length; i++) {
    var end = Number(content[i] && content[i].endIndex);
    if (isFinite(end) && end > lastEnd) {
      lastEnd = end;
    }
  }
  return Math.max(1, lastEnd - 1);
}

function formatNow_() {
  var fallbackTz = Session.getScriptTimeZone();
  var preferredTz = 'America/Los_Angeles';
  try {
    return Utilities.formatDate(new Date(), preferredTz, 'yyyy-MM-dd HH:mm');
  } catch (err) {
    return Utilities.formatDate(new Date(), fallbackTz, 'yyyy-MM-dd HH:mm');
  }
}
