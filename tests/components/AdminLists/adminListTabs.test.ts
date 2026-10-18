import {
  ADMIN_LIST_TABS,
  DEFAULT_ADMIN_LIST_TAB,
  isAdminListTab,
  resolveAdminListTab,
} from '@/app/components/AdminLists/adminListTabs';

const params = (search: string) => new URLSearchParams(search);

describe('adminListTabs', () => {
  it('S1: lists the four tabs as messages, users, collections, roles, the default first', () => {
    expect(ADMIN_LIST_TABS.map(t => t.id)).toEqual(['messages', 'users', 'collections', 'roles']);
    expect(ADMIN_LIST_TABS[0]?.id).toBe(DEFAULT_ADMIN_LIST_TAB);
  });

  it('A6: labels the tabs Messages, Users, Collections, Roles', () => {
    expect(ADMIN_LIST_TABS.map(t => t.label)).toEqual([
      'Messages',
      'Users',
      'Collections',
      'Roles',
    ]);
  });

  it('S1: the default tab is messages', () => {
    expect(DEFAULT_ADMIN_LIST_TAB).toBe('messages');
  });

  it('recognises only known tab ids', () => {
    expect(isAdminListTab('roles')).toBe(true);
    expect(isAdminListTab('admin')).toBe(false);
    expect(isAdminListTab(null)).toBe(false);
  });

  describe('resolveAdminListTab', () => {
    it('A6: defaults to messages when ?list= is absent', () => {
      expect(resolveAdminListTab(params(''))).toBe('messages');
    });

    it('reads ?list=', () => {
      expect(resolveAdminListTab(params('list=collections'))).toBe('collections');
    });

    it('S1: opens Roles for a ?role= link with no ?list=', () => {
      expect(resolveAdminListTab(params('role=3'))).toBe('roles');
    });

    it('lets ?list= win over ?role=', () => {
      expect(resolveAdminListTab(params('list=messages&role=3'))).toBe('messages');
    });

    it('ignores an unknown ?list= value', () => {
      expect(resolveAdminListTab(params('list=nope'))).toBe('messages');
    });
  });
});
