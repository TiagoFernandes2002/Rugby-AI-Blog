// backend/src/__tests__/rugbyData.test.js
const { LEAGUE_INFO } = require('../rugbyData');

describe('rugbyData', () => {
  describe('LEAGUE_INFO', () => {
    it('should contain all expected leagues', () => {
      const expectedLeagues = [
        'TOP14',
        'PREMIERSHIP',
        'URC',
        'SUPER_RUGBY',
        'SIX_NATIONS',
        'RUGBY_CHAMPIONSHIP',
        'CHAMPIONS_CUP',
        'CN_HONRA_PORTUGAL',
      ];

      expectedLeagues.forEach((league) => {
        expect(LEAGUE_INFO).toHaveProperty(league);
      });
    });

    it('should have id and season for each league', () => {
      Object.values(LEAGUE_INFO).forEach((info) => {
        expect(info).toHaveProperty('id');
        expect(info).toHaveProperty('season');
        expect(typeof info.id).toBe('number');
        expect(typeof info.season).toBe('number');
      });
    });

    it('TOP14 should have id 16 and season 2022', () => {
      expect(LEAGUE_INFO.TOP14.id).toBe(16);
      expect(LEAGUE_INFO.TOP14.season).toBe(2022);
    });

    it('should have positive IDs', () => {
      Object.values(LEAGUE_INFO).forEach((info) => {
        expect(info.id).toBeGreaterThan(0);
      });
    });
  });
});
