// GAS(구글시트)가 연결되지 않았을 때 사용하는 데모 데이터.
// 좌표는 부산권 실제 위치 부근으로 넣어 지도/경로가 자연스럽게 동작합니다.
// *_en 필드는 영어 모드에서 표시되며, 비어있으면 한글로 폴백됩니다.
import { DEFAULT_YARD } from './constants.js'

export const SAMPLE = {
  yard: { ...DEFAULT_YARD },
  partners: [
    {
      id: 'p1', name: '대한코팅', name_en: 'Daehan Coating', cat: 'paint',
      addr: '부산광역시 강서구 미음산단로', addr_en: 'Mieum Industrial Complex, Gangseo-gu, Busan',
      desc: '선체 외판 방식 도장 전문', desc_en: 'Hull plate anti-corrosion coating',
      lat: 35.1019, lng: 128.8516,
      items: [
        { id: 'i1', name: '선수부 보수 도장', start: '2026-04-05', end: '2026-05-12', status: 'done' },
        { id: 'i2', name: '1번 도크 외판 도장', start: '2026-05-25', end: '2026-07-08', status: 'prog' },
        { id: 'i3', name: '2번 블록 방식 도장', start: '2026-07-15', end: '2026-08-22', status: 'plan' },
      ],
    },
    {
      id: 'p2', name: '동양블라스팅', name_en: 'Dongyang Blasting', cat: 'surf',
      addr: '부산광역시 사하구 다대로', addr_en: 'Dadae-ro, Saha-gu, Busan',
      desc: '블록 표면 블라스팅·표면처리 외주', desc_en: 'Block surface blasting & surface prep',
      lat: 35.0461, lng: 128.9692,
      items: [
        { id: 'i4', name: '블록 표면 블라스팅 1차', start: '2026-04-10', end: '2026-05-20', status: 'done' },
        { id: 'i5', name: '의장품 표면처리', start: '2026-06-01', end: '2026-07-10', status: 'prog' },
      ],
    },
    {
      id: 'p3', name: '정밀기계공업', name_en: 'Jeongmil Machinery', cat: 'mech',
      addr: '경상남도 양산시 산막공단북5길', addr_en: 'Sanmak Industrial Complex, Yangsan',
      desc: '러더·샤프트 정밀 부품 가공 및 납품', desc_en: 'Precision rudder & shaft machining',
      lat: 35.3604, lng: 129.0186,
      items: [
        { id: 'i6', name: '러더 부품 가공', start: '2026-05-01', end: '2026-06-15', status: 'prog' },
        { id: 'i7', name: '프로펠러 샤프트 가공', start: '2026-06-20', end: '2026-08-10', status: 'plan' },
      ],
    },
    {
      id: 'p4', name: '해성전기', name_en: 'Haesung Electric', cat: 'elec',
      addr: '부산광역시 사상구 학장로', addr_en: 'Hakjang-ro, Sasang-gu, Busan',
      desc: '선박 전장 설치 및 배선 시공', desc_en: 'Marine electrical install & wiring',
      lat: 35.1402, lng: 128.9871,
      items: [
        { id: 'i8', name: '거주구 전장 배선', start: '2026-04-15', end: '2026-06-30', status: 'prog' },
        { id: 'i9', name: '항해장비 결선', start: '2026-07-05', end: '2026-08-25', status: 'plan' },
      ],
    },
    {
      id: 'p5', name: '남부정밀용접', name_en: 'Nambu Precision Welding', cat: 'weld',
      addr: '울산광역시 울주군 온산읍', addr_en: 'Onsan-eup, Ulju-gun, Ulsan',
      desc: '블록 정도관리 및 구조 용접', desc_en: 'Block accuracy control & structural welding',
      lat: 35.4214, lng: 129.3242,
      items: [
        { id: 'i10', name: '엔진룸 블록 용접', start: '2026-05-10', end: '2026-07-20', status: 'prog' },
      ],
    },
  ],
  projects: [
    { id: 'prj1', name: '2031호선 (PCTC)', name_en: 'Hull 2031 (PCTC)', note: '자동차운반선', partnerIds: ['p1', 'p2', 'p4'] },
    { id: 'prj2', name: '2032호선 (LNG)', name_en: 'Hull 2032 (LNG)', note: 'LNG운반선', partnerIds: ['p1', 'p3', 'p5'] },
  ],
}

// 깊은 복사 (앱에서 in-memory 편집 시 원본 보호)
export function cloneSample() {
  return JSON.parse(JSON.stringify(SAMPLE))
}
