import { checkNodeVersion } from '../check-node-version';

describe('checkNodeVersion', () => {
    const currentMajor = parseInt(process.versions.node.split('.')[0], 10);

    it('should return true when current major version is greater or equal', () => {
        expect(checkNodeVersion(currentMajor)).toBe(true);
        expect(checkNodeVersion(currentMajor - 1)).toBe(true);
    });

    it('should return false when required major version is higher', () => {
        expect(checkNodeVersion(currentMajor + 1)).toBe(false);
    });
});
