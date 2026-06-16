export default function ProjectBar({ projects, activeId, onSelect, onManage }) {
  return (
    <div className="projbar">
      <span className="pb-label"><span className="material-symbols-outlined">folder_open</span>프로젝트</span>

      <button className={'chip' + (activeId === null ? ' active' : '')} onClick={() => onSelect(null)}>
        전체
      </button>

      {projects.map((pr) => (
        <button
          key={pr.id}
          className={'chip' + (activeId === pr.id ? ' active' : '')}
          onClick={() => onSelect(pr.id)}
          title={pr.note || pr.name}
        >
          {pr.name}
          <span className="cnt">{(pr.partnerIds || []).length}</span>
        </button>
      ))}

      <button className="chip chip-add" onClick={onManage}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>tune</span>
        프로젝트 관리
      </button>
    </div>
  )
}
