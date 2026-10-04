const fs = require('fs');
const path = 'C:/Users/DELL/Desktop/employs/src/components/schedule/WeeklyScheduleTable.js';

let content = fs.readFileSync(path, 'utf8');

// ── Fix 1: Mobile cards — change canEdit to cell._id ──────────────────────
content = content.replace(
  '{canEdit && <AILessonSuggest cell={cell} onApply={handleInputChange} />}',
  '{cell._id && <AILessonSuggest cell={cell} onApply={handleInputChange} />}'
);

// ── Fix 2: Desktop table — inject AI button inside lesson title <td> ──────
// Find the start of the lesson title td block
const START = '{/* Lesson Title \u2014 Direct Inline Input */}';
const startIdx = content.indexOf(START);
if (startIdx === -1) {
  console.error('Could not find lesson title block');
  process.exit(1);
}

// Find the closing </td> for this block (look for the next {/* Homework marker))
const HOMEWORK_MARKER = '{/* Homework & Activities';
const hwIdx = content.indexOf(HOMEWORK_MARKER, startIdx);
if (hwIdx === -1) {
  console.error('Could not find homework marker');
  process.exit(1);
}

// Walk backwards from hwIdx to find the last </td> before homework
const sliceBefore = content.substring(startIdx, hwIdx);
const lastTdClose = sliceBefore.lastIndexOf('</td>');
if (lastTdClose === -1) {
  console.error('Could not find closing </td>');
  process.exit(1);
}

const blockEnd = startIdx + lastTdClose + '</td>'.length;
const oldBlock = content.substring(startIdx, blockEnd);

// Check if already patched
if (oldBlock.includes('AILessonSuggest')) {
  console.log('Desktop table AI button already present — skipping Fix 2');
} else {
  // Build the new block preserving CRLF
  const nl = '\r\n';
  const i = '                      '; // 22 spaces indent
  const ii = '                            '; // 28 spaces

  const newBlock = [
    START,
    i + '<td',
    i + `  className={\`border border-slate-300 p-0 align-middle \${!canEdit ? "bg-slate-100/90" : ""} \${cell && isBlank(getCellValue(cell, "lessonTitle")) ? "bg-red-50/70" : ""} \${daySeparation}\`}`,
    i + '>',
    i + '  {cell ? (',
    i + '    <div className="flex flex-col h-full min-h-[92px]">',
    i + '      {canEdit && enableInlineEdit ? (',
    i + '        <input',
    i + '          type="text"',
    i + `          value={getCellValue(cell, "lessonTitle")}`,
    i + '          onChange={(e) =>',
    i + '            handleInputChange(',
    i + '              cell._id,',
    i + '              "lessonTitle",',
    i + '              e.target.value,',
    i + '            )',
    i + '          }',
    i + '          placeholder="\u0627\u0643\u062a\u0628 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062f\u0631\u0633 \u0648\u0627\u0644\u0645\u0648\u0636\u0648\u0639..."',
    i + `          className={\`w-full flex-1 min-h-[68px] px-3 py-3 text-xs font-semibold text-slate-900 border-0 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-blue-50/20 transition-all \${isBlank(getCellValue(cell, "lessonTitle")) ? "bg-red-50 placeholder:text-red-400" : "bg-white"}\`}`,
    i + '        />',
    i + '      ) : (',
    i + '        <p className="text-slate-900 font-bold leading-relaxed px-2 py-2 flex-1">',
    i + '          {cell.lessonTitle || (',
    i + '            <span className="text-slate-300 text-xs italic font-normal">',
    i + '              \u0644\u0645 \u064a\u064f\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u0631\u0633 \u0628\u0639\u062f',
    i + '            </span>',
    i + '          )}',
    i + '        </p>',
    i + '      )}',
    i + '      {/* \u2728 AI Suggestions */}',
    i + '      <div className="px-2 pb-1.5 no-print no-export">',
    i + '        <AILessonSuggest',
    i + '          cell={cell}',
    i + '          onApply={(scheduleId, field, value) =>',
    i + '            handleInputChange(scheduleId, field, value)',
    i + '          }',
    i + '        />',
    i + '      </div>',
    i + '    </div>',
    i + '  ) : (',
    i + '    <span className="text-slate-300 text-xs italic">',
    i + '      \u2014',
    i + '    </span>',
    i + '  )}',
    i + '</td>',
  ].join(nl);

  content = content.substring(0, startIdx) + newBlock + content.substring(blockEnd);
  console.log('Fix 2 applied: Desktop table AI button injected');
}

fs.writeFileSync(path, content, 'utf8');
console.log('File saved successfully');

// Verify
const verify = fs.readFileSync(path, 'utf8');
const aiMatches = (verify.match(/AILessonSuggest/g) || []);
console.log('AILessonSuggest occurrences:', aiMatches.length);
aiMatches.forEach((_, i) => {
  const idx = verify.indexOf('AILessonSuggest', i === 0 ? 0 : verify.indexOf('AILessonSuggest') + 1);
});

// Print all lines with AILessonSuggest
verify.split('\n').forEach((line, i) => {
  if (line.includes('AILessonSuggest')) console.log('  L' + (i+1) + ': ' + line.trim());
});
