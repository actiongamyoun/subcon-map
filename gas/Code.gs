/**
 * 사외협력사 안내 — 구글시트 백엔드 (Google Apps Script)
 *
 * [설치]
 *  1) 데이터를 담을 구글 스프레드시트를 하나 만든다.
 *  2) 확장 프로그램 > Apps Script 를 열고 이 코드를 전부 붙여넣는다.
 *  3) 저장 후 [배포 > 새 배포 > 유형: 웹 앱]
 *     - 실행: 나
 *     - 액세스: 모든 사용자
 *  4) 배포 URL(.../exec)을 Vercel 환경변수 GAS_URL 에 등록한다.
 *
 * 시트 4개(조선소/협력사/프로젝트)는 처음 호출 시 자동 생성된다.
 * 협력사의 아이템(공정·일정)은 "협력사" 시트 items 칼럼에 JSON 으로 저장한다.
 */

var SHEETS = {
  yard:     { name: '조선소',   headers: ['name', 'name_en', 'addr', 'addr_en', 'lat', 'lng'] },
  partners: { name: '협력사',   headers: ['id', 'name', 'name_en', 'cat', 'addr', 'addr_en', 'desc', 'desc_en', 'lat', 'lng', 'items', 'homepage', 'brochure'] },
  projects: { name: '프로젝트', headers: ['id', 'name', 'name_en', 'note', 'partnerIds'] },
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'list'
  if (action === 'list') return json(listAll())
  return json({ ok: false, error: 'unknown GET action: ' + action })
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var action = body.action
    var payload = body.payload || {}
    switch (action) {
      case 'saveYard':      return json(saveYard(payload))
      case 'savePartner':   return json(savePartner(payload))
      case 'deletePartner': return json(deletePartner(payload))
      case 'saveProject':   return json(saveProject(payload))
      case 'deleteProject': return json(deleteProject(payload))
      case 'uploadBrochure': return json(uploadBrochure(payload))
      default:              return json({ ok: false, error: 'unknown action: ' + action })
    }
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
}

/* ───────── 읽기 ───────── */
function listAll() {
  var yardRows = readObjects(SHEETS.yard)
  var yard = yardRows[0] || {}
  if (yard.lat) yard.lat = Number(yard.lat)
  if (yard.lng) yard.lng = Number(yard.lng)

  var partners = readObjects(SHEETS.partners).map(function (p) {
    return {
      id: String(p.id),
      name: p.name,
      name_en: p.name_en || '',
      cat: p.cat || 'etc',
      addr: p.addr || '',
      addr_en: p.addr_en || '',
      desc: p.desc || '',
      desc_en: p.desc_en || '',
      lat: p.lat ? Number(p.lat) : null,
      lng: p.lng ? Number(p.lng) : null,
      items: parseJson(p.items, []),
      homepage: p.homepage || '',
      brochure: p.brochure || '',
    }
  })

  var projects = readObjects(SHEETS.projects).map(function (pr) {
    return {
      id: String(pr.id),
      name: pr.name,
      name_en: pr.name_en || '',
      note: pr.note || '',
      partnerIds: String(pr.partnerIds || '')
        .split(',')
        .map(function (s) { return s.trim() })
        .filter(String),
    }
  })

  return { ok: true, yard: yard, partners: partners, projects: projects }
}

/* ───────── 쓰기 ───────── */
function saveYard(p) {
  var sh = getSheet(SHEETS.yard)
  var row = [p.name || '', p.name_en || '', p.addr || '', p.addr_en || '', p.lat || '', p.lng || '']
  if (sh.getLastRow() < 2) sh.appendRow(row)
  else sh.getRange(2, 1, 1, row.length).setValues([row])
  return { ok: true }
}

function savePartner(p) {
  var def = SHEETS.partners
  var sh = getSheet(def)
  var id = p.id || genId('p')
  var row = [
    id, p.name || '', p.name_en || '', p.cat || 'etc',
    p.addr || '', p.addr_en || '', p.desc || '', p.desc_en || '',
    p.lat || '', p.lng || '', JSON.stringify(p.items || []),
    p.homepage || '', p.brochure || '',
  ]
  var r = findRowById(sh, id)
  if (r > 0) sh.getRange(r, 1, 1, row.length).setValues([row])
  else sh.appendRow(row)
  return { ok: true, id: id }
}

function deletePartner(p) {
  var sh = getSheet(SHEETS.partners)
  var r = findRowById(sh, p.id)
  if (r > 0) sh.deleteRow(r)
  // 프로젝트 멤버에서도 제거
  var psh = getSheet(SHEETS.projects)
  var data = readObjects(SHEETS.projects)
  data.forEach(function (pr, i) {
    var ids = String(pr.partnerIds || '').split(',').map(function (s) { return s.trim() }).filter(String)
    if (ids.indexOf(String(p.id)) >= 0) {
      var next = ids.filter(function (x) { return x !== String(p.id) }).join(',')
      psh.getRange(i + 2, colIndex(SHEETS.projects, 'partnerIds') + 1).setValue(next)
    }
  })
  return { ok: true }
}

function saveProject(p) {
  var sh = getSheet(SHEETS.projects)
  var id = p.id || genId('prj')
  var ids = (p.partnerIds || []).join(',')
  var row = [id, p.name || '', p.name_en || '', p.note || '', ids]
  var r = findRowById(sh, id)
  if (r > 0) sh.getRange(r, 1, 1, row.length).setValues([row])
  else sh.appendRow(row)
  return { ok: true, id: id }
}

function deleteProject(p) {
  var sh = getSheet(SHEETS.projects)
  var r = findRowById(sh, p.id)
  if (r > 0) sh.deleteRow(r)
  return { ok: true }
}

/* ───────── 헬퍼 ───────── */
function getSheet(def) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(def.name)
  if (!sh) {
    sh = ss.insertSheet(def.name)
    sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers])
    sh.setFrozenRows(1)
    return sh
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers])
    sh.setFrozenRows(1)
    return sh
  }
  ensureHeaders(sh, def) // 기존 시트에 새 칼럼(homepage/brochure 등) 자동 보강
  return sh
}

// 헤더가 def.headers 보다 적거나 다르면 누락 칼럼 헤더를 추가 (기존 데이터는 보존)
function ensureHeaders(sh, def) {
  if (sh.getMaxColumns() < def.headers.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), def.headers.length - sh.getMaxColumns())
  }
  var cur = sh.getRange(1, 1, 1, def.headers.length).getValues()[0]
  var changed = false
  for (var i = 0; i < def.headers.length; i++) {
    if (String(cur[i] || '') !== def.headers[i]) { cur[i] = def.headers[i]; changed = true }
  }
  if (changed) sh.getRange(1, 1, 1, def.headers.length).setValues([cur])
}

function readObjects(def) {
  var sh = getSheet(def)
  var last = sh.getLastRow()
  if (last < 2) return []
  var headers = sh.getRange(1, 1, 1, def.headers.length).getValues()[0]
  var values = sh.getRange(2, 1, last - 1, def.headers.length).getValues()
  return values
    .filter(function (r) { return String(r[0]).length || String(r[1]).length })
    .map(function (r) {
      var o = {}
      headers.forEach(function (h, i) { o[h] = r[i] })
      return o
    })
}

function findRowById(sh, id) {
  var last = sh.getLastRow()
  if (last < 2) return -1
  var ids = sh.getRange(2, 1, last - 1, 1).getValues()
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2
  }
  return -1
}

function colIndex(def, header) {
  return def.headers.indexOf(header)
}

function parseJson(s, fallback) {
  try { return s ? JSON.parse(s) : fallback } catch (e) { return fallback }
}

function genId(prefix) {
  return prefix + '_' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1000)
}

/* ───────── 회사소개서 PDF 업로드 (구글드라이브) ───────── */
function uploadBrochure(p) {
  if (!p || !p.data) return { ok: false, error: 'no file data' }
  var folder = getBrochureFolder()
  var bytes = Utilities.base64Decode(p.data)
  var blob = Utilities.newBlob(bytes, p.mime || 'application/pdf', sanitizeName(p.name))
  var file = folder.createFile(blob)
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  } catch (e) { /* 공유 설정 실패해도 파일은 생성됨 */ }
  return { ok: true, url: 'https://drive.google.com/file/d/' + file.getId() + '/view', id: file.getId() }
}

function getBrochureFolder() {
  var NAME = '협력사_회사소개서'
  var it = DriveApp.getFoldersByName(NAME)
  if (it.hasNext()) return it.next()
  return DriveApp.createFolder(NAME)
}

function sanitizeName(name) {
  var n = String(name || 'brochure.pdf').replace(/[\\/:*?"<>|]/g, '_')
  if (!/\.pdf$/i.test(n)) n += '.pdf'
  return n
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  )
}
