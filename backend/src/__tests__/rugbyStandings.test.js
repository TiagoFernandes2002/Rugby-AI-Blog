// backend/src/__tests__/rugbyStandings.test.js
const { LEAGUE_IDS } = require('../rugbyStandings');

describe('rugbyStandings', () => {
  describe('LEAGUE_IDS', () => {
    it('should contain all expected league keys', () => {
      expect(LEAGUE_IDS).toHaveProperty('TOP14');
      expect(LEAGUE_IDS).toHaveProperty('PREMIERSHIP');
      expect(LEAGUE_IDS).toHaveProperty('URC');
      expect(LEAGUE_IDS).toHaveProperty('SUPER_RUGBY');
      expect(LEAGUE_IDS).toHaveProperty('SIX_NATIONS');
      expect(LEAGUE_IDS).toHaveProperty('RUGBY_CHAMPIONSHIP');
      expect(LEAGUE_IDS).toHaveProperty('CHAMPIONS_CUP');
      expect(LEAGUE_IDS).toHaveProperty('CN_HONRA_PORTUGAL');
    });

    it('should have numeric IDs for each league', () => {
      Object.values(LEAGUE_IDS).forEach((id) => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
      });
    });

    it('should map TOP14 to ID 16', () => {
      expect(LEAGUE_IDS.TOP14).toBe(16);
    });

    it('should map PREMIERSHIP to ID 13', () => {
      expect(LEAGUE_IDS.PREMIERSHIP).toBe(13);
    });

    it('should map URC to ID 76', () => {
      expect(LEAGUE_IDS.URC).toBe(76);
    });
  });
});
