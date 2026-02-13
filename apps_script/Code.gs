const DOC_ID = '<REPLACE_WITH_DOC_ID>';

const TAG_TO_SECTION = {
  todo: 'TODO',
  it: 'Apex 2 Integration Test Approach',
  a2: 'Apex 2 General',
  aiqa: 'AI in QA Proposal',
  fu: 'Follow Up',
  misc: 'Miscellany',
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing POST body');
    }

    var payload = JSON.parse(e.postData.contents);
    var type = payload && payload.type;
    var text = payload && payload.text;
    var who = payload && payload.who;

    if (!type || String(type).trim() === '') {
      throw new Error('Missing required field: type');
    }
    if (!text || String(text).trim() === '') {
      throw new Error('Missing required field: text');
    }

    appendEntry(type, text, who);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function appendEntry(typeRaw, textRaw, who) {
  var type = normalizeType_(typeRaw);
  var sectionTitle = TAG_TO_SECTION[type] || TAG_TO_SECTION.misc;
  var text = String(textRaw || '').trim();
  if (!text) {
    throw new Error('text is empty after trimming');
  }

  var whoSafe = String(who || 'LB').trim() || 'LB';
  var timestamp = formatNow_();
  var line = '- ' + timestamp + ' [' + whoSafe + ']: ' + text;

  var doc = DocumentApp.openById(DOC_ID);
  var body = doc.getBody();

  var loc = findOrCreateH1Section_(body, sectionTitle);
  var insertionIndex = loc.insertionIndex;

  // Prefer real checkbox list items; if unsupported in this context, fallback to plain text.
  try {
    var listItem = body.insertListItem(insertionIndex, line);
    listItem.setGlyphType(DocumentApp.GlyphType.CHECKBOX);
  } catch (err) {
    body.insertParagraph(insertionIndex, '[ ] ' + line);
  }

  doc.saveAndClose();
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

function formatNow_() {
  var fallbackTz = Session.getScriptTimeZone();
  var preferredTz = 'America/Los_Angeles';
  try {
    return Utilities.formatDate(new Date(), preferredTz, 'yyyy-MM-dd HH:mm');
  } catch (err) {
    return Utilities.formatDate(new Date(), fallbackTz, 'yyyy-MM-dd HH:mm');
  }
}
