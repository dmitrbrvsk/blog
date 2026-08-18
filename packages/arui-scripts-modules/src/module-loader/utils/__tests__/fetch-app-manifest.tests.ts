import { fetchAppManifest } from '../fetch-app-manifest';

function createXhrMock() {
    const listeners = new Map<string, () => void>();

    return {
        listeners,
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        addEventListener: jest.fn((type: string, listener: () => void) => {
            listeners.set(type, listener);
        }),
        status: 200,
        responseText: '',
        statusText: '',
    };
}

describe('fetchAppManifest', () => {
    let xhrMock = createXhrMock();

    beforeEach(() => {
        window.XMLHttpRequest = jest.fn(() => xhrMock) as unknown as typeof XMLHttpRequest;
        xhrMock = createXhrMock();
    });

    it('should return parsed manifest', async () => {
        xhrMock.responseText = JSON.stringify('Hello World!');
        const manifestPromise = fetchAppManifest('http://test/manifest.json');

        xhrMock.listeners.get('load')?.();

        await expect(manifestPromise).resolves.toEqual('Hello World!');
    });

    it('should reject promise if status is not 200', async () => {
        xhrMock.status = 404;
        xhrMock.statusText = 'Not Found';
        const manifestPromise = fetchAppManifest('http://test/manifest.json');

        xhrMock.listeners.get('load')?.();

        await expect(manifestPromise).rejects.toThrow(
            'App manifest request failed: http://test/manifest.json responded with 404 Not Found',
        );
    });

    it('should reject promise with status code if statusText is empty', async () => {
        xhrMock.status = 502;
        const manifestPromise = fetchAppManifest('http://test/manifest.json');

        xhrMock.listeners.get('load')?.();

        await expect(manifestPromise).rejects.toThrow(
            'App manifest request failed: http://test/manifest.json responded with 502',
        );
    });

    it('should reject promise if response is not a valid json', async () => {
        xhrMock.responseText = '<!doctype html>';
        const manifestPromise = fetchAppManifest('http://test/manifest.json');

        xhrMock.listeners.get('load')?.();

        await expect(manifestPromise).rejects.toThrow(
            /App manifest request failed: http:\/\/test\/manifest\.json returned invalid JSON/,
        );
    });

    it('should reject promise if request was errored', async () => {
        const manifestPromise = fetchAppManifest('http://test/manifest.json');

        xhrMock.listeners.get('error')?.();

        await expect(manifestPromise).rejects.toThrow(
            /App manifest request failed: network error while requesting http:\/\/test\/manifest\.json/,
        );
    });
});
