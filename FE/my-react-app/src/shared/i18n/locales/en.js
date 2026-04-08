export const en = {
  translation: {
    nav: {
      systemName: 'Design system',
      projectName: 'Architectural Ledger',
      newBoard: 'New board',
      language: 'Language',
    },
    hero: {
      kicker: 'Editorial dashboard',
      title: 'A project command space with rhythm and tonal depth',
      description:
        'The layout prioritizes whitespace, typographic hierarchy, and tonal layering so dense information stays breathable. Each module behaves like a stacked sheet, without hard 1px dividers.',
    },
    metrics: {
      cards: [
        { label: 'Open tasks', value: '28', delta: '+4 today' },
        { label: 'Sprint progress', value: '74%', delta: '+9% this week' },
        { label: 'High risks', value: '03', delta: 'Needs early action' },
      ],
    },
    quickAdd: {
      title: 'Quick add bar',
      subtitle: 'A floating layer for immediate planning updates in context.',
      hint: 'Glass mode',
      placeholder: 'Type a priority task...',
      button: 'Add to sprint',
    },
    focus: {
      kicker: 'Focus rail',
      title: 'Signals worth attention',
      items: [
        { title: 'Backend auth gateway', meta: '2 blocked items for review in the next 45 minutes' },
        { title: 'Release milestone R2', meta: 'QA confirmation required before 16:30' },
        { title: 'Dependency watch', meta: '3 packages need security updates' },
      ],
    },
    board: {
      kicker: 'Coordination board',
      title: 'Execution Ledger',
      subtitle:
        'The list relies on spacing and tonal shifts for separation. High priority is indicated by a subtle 4px red tab on the left edge.',
    },
    filters: {
      active: 'In progress',
      upcoming: 'Upcoming',
      review: 'Needs review',
    },
    tasks: [
      {
        title: 'Finalize login flow + token refresh',
        owner: 'Owner: Nhan - Auth team',
        due: 'Due: Friday, 17:00',
        tag: 'Auth',
        priority: 'high',
        progress: 61,
      },
      {
        title: 'Sync API schema between FE and BE',
        owner: 'Owner: Khoa - Platform',
        due: 'Due: Thursday, 14:00',
        tag: 'API',
        priority: 'normal',
        progress: 42,
      },
      {
        title: 'Refactor task filter by status',
        owner: 'Owner: Linh - Frontend',
        due: 'Due: Friday, 11:30',
        tag: 'UI',
        priority: 'normal',
        progress: 78,
      },
      {
        title: 'Run regression after merge',
        owner: 'Owner: Minh - QA',
        due: 'Due: Saturday, 10:00',
        tag: 'QA',
        priority: 'high',
        progress: 35,
      },
    ],
  },
}
