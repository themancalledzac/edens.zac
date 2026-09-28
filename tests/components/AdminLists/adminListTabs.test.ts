import {
  ADMIN_LIST_TABS,
  DEFAULT_ADMIN_LIST_TAB,
  isAdminListTab,
  resolveAdminListTab,
} from '@/app/components/AdminLists/adminListTabs';

const params = (search: string) => new URLSearchParams(search);

describe('adminListTabs', () => {
  it('lists the four tabs in strip order, the default first', () => {
    expect(ADMIN_LIST_TABS.map(t => t.id)).toEqual(['users', 'messages', 'roles', 'collections']);
    expect(ADMIN_LIST_TABS[0]?.id).toBe(DEFAULT_ADMIN_LIST_TAB);
  });

  it('recognises only known tab ids', () => {
    expect(isAdminListTab('roles')).toBe(true);
    expect(isAdminListTab('admin')).toBe(false);
    expect(isAdminListTab(null)).toBe(false);
  });

  describe('resolveAdminListTab', () => {
    it('defaults to users', () => {
      expect(resolveAdminListTab(params(''))).toBe('users');
    });

    it('reads ?list=', () => {
      expect(resolveAdminListTab(params('list=collections'))).toBe('collections');
    });

    it('opens Roles for a ?role= link', () => {
      expect(resolveAdminListTab(params('role=3'))).toBe('roles');
    });

    it('lets ?list= win over ?role=', () => {
      expect(resolveAdminListTab(params('list=messages&role=3'))).toBe('messages');
    });

    it('ignores an unknown ?list= value', () => {
      expect(resolveAdminListTab(params('list=nope'))).toBe('users');
    });
  });
});
