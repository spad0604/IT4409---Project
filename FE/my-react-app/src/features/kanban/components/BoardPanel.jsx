import { FiChevronRight, FiPlus } from 'react-icons/fi'
import { formatShortDate, priorityDisplay, safeLower, toInitials } from '../kanbanUtils'

const BOARD_STAGE_PROGRESS = {
  todo: 25,
  in_progress: 55,
  in_review: 80,
  done: 100,
}

export default function BoardPanel({
  t,
  boardDetail,
  kanbanColumns,
  boardDoneCount,
  boardTaskTotal,
  boardCompletion,
  dropColumnID,
  dragState,
  activeLocale,
  usersById,
  onCardDragStart,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDrop,
  onOpenIssueDetails,
}) {
  const totalColumns = kanbanColumns.length

  return (
    <section className="board-shell" aria-label="Draggable board">
      <header className="board-hero panel">
        <div className="board-hero-copy">
          <p className="dashboard-kicker">{t('boardShell.contentTitle')}</p>
          <h1>{boardDetail?.name || t('board.title')}</h1>
          <p className="board-subtitle">{t('boardShell.contentSubtitle')}</p>
        </div>

        <div className="board-hero-meta">
          <div className="board-metric">
            <span>{t('board.cards')}</span>
            <strong>{boardTaskTotal}</strong>
          </div>
          <div className="board-metric">
            <span>{t('board.completed')}</span>
            <strong>{boardDoneCount}</strong>
          </div>
          <div className="board-metric">
            <span>{t('board.columns.todo')}</span>
            <strong>{totalColumns}</strong>
          </div>
          <div className="board-hero-actions">
            <div className="mini-avatars" aria-hidden="true">
              <span>AN</span>
              <span>AR</span>
              <span>MT</span>
            </div>
            <button type="button" className="filter-btn">{t('common.filters')}</button>
          </div>
        </div>

        <div className="board-progress board-progress-hero">
          <div className="board-progress-track" aria-hidden="true">
            <span style={{ width: `${boardCompletion}%` }} />
          </div>
          <span>{boardCompletion}% {t('board.completion')}</span>
        </div>
      </header>

      <section className="board-flow panel">
        <div className="flow-header">
          <h2>{t('board.flowProgress')}</h2>
          <p>{boardDoneCount}/{boardTaskTotal} {t('board.completed')}</p>
        </div>

        <div className="flow-track" aria-hidden="true">
          {kanbanColumns.map((column, index) => (
            <div key={column.id} className="flow-step-wrap">
              <div className={`flow-step is-${column.tone}`}>
                <span>{column.title}</span>
                <strong>{column.items.length}</strong>
              </div>
              {index < kanbanColumns.length - 1 ? <FiChevronRight className="flow-arrow" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="board-columns" aria-label="Kanban lanes">
        {kanbanColumns.map((column) => (
          <article
            key={column.id}
            className={`board-column is-${column.tone} ${dropColumnID === column.id ? 'is-drop-target' : ''}`}
            onDragOver={(event) => onColumnDragOver(event, column.id)}
            onDrop={(event) => onColumnDrop(event, column.id)}
          >
            <header className="board-column-head">
              <div>
                <h3>{column.title}</h3>
                <p>{column.items.length} {t('board.cards')}</p>
              </div>
              <button type="button" className="lane-add-btn" aria-label={t('board.addCardTo', { column: column.title })}>
                <FiPlus />
              </button>
            </header>

            <div className="board-card-list">
              {column.items.map((item) => {
                const pr = priorityDisplay(item?.priority)
                const due = formatShortDate(item?.dueDate, activeLocale)
                const assignee = item?.assigneeId ? usersById[String(item.assigneeId)] : null
                const assigneeInitials = toInitials(assignee?.name || assignee?.email || '')
                return (
                  <article
                    key={item.key}
                    className={`board-card ${dragState?.cardID === item.key ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={(event) => onCardDragStart(event, column.id, item.key)}
                    onDragEnd={onCardDragEnd}
                    onDoubleClick={() => onOpenIssueDetails(item.key)}
                  >
                    <p className="board-card-code">{item.key}</p>
                    <h4>{item.title}</h4>

                    <div className="board-card-meta">
                      <span className={`board-card-chip tone-${safeLower(item?.status) || 'todo'}`}>
                        {t(`issue.status.${safeLower(item?.status)}`, { defaultValue: String(item?.status || '-') })}
                      </span>
                      <span className={`board-card-chip tone-${pr.tone}`}>{t(`priority.${pr.tone}`, { defaultValue: pr.label })}</span>
                    </div>

                    <div className="board-progress-track compact" aria-hidden="true">
                      <span style={{ width: `${BOARD_STAGE_PROGRESS[column.id] ?? 25}%` }} />
                    </div>

                    <footer className="board-card-foot">
                      <span>{due ? `${t('common.due')}: ${due}` : t('common.noDueDateShort')}</span>
                      <span className="card-avatar">{assigneeInitials || '??'}</span>
                    </footer>
                  </article>
                )
              })}
            </div>
          </article>
        ))}
      </section>

      <button type="button" className="quick-action-btn">{t('boardShell.quickActions')}</button>
    </section>
  )
}
