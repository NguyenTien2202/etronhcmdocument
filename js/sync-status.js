/* Observe operations through an adapter, without changing SDK prototypes or retrying writes. */
(() => {
    const failures = new Set();
    let pending = 0;
    let received = false;
    let saved = false;
    const cachedSources = new Map();
    const wrapped = new WeakMap();
    const status = () => {
        if (!navigator.onLine) return 'Mất mạng — thay đổi cloud đang chờ kết nối';
        if (failures.size) return 'Đồng bộ lỗi — hãy kiểm tra kết nối/quyền và thử lưu lại';
        if (pending) return 'Đang lưu lên cloud…';
        if (!window.firebaseDb) return 'Chỉ lưu trên thiết bị — chưa kết nối cloud';
        if ([...cachedSources.values()].some(Boolean)) return 'Đang dùng bộ nhớ đệm — chờ xác nhận từ cloud';
        if (saved) return 'Đã lưu lên cloud';
        return received ? 'Đã kết nối cloud' : 'Đang kết nối cloud…';
    };
    function render() {
        const el = document.getElementById('cloud-sync-status');
        if (el) el.textContent = status();
    }
    function wrap(ref) {
        if (wrapped.has(ref)) return wrapped.get(ref);
        const proxy = new Proxy(ref, {
            get(target, prop) {
                const value = target[prop];
                if (typeof value !== 'function') return value;
                if (['collection', 'doc', 'where', 'orderBy', 'limit'].includes(prop)) {
                    return (...args) => wrap(value.apply(target, args));
                }
                if (['set', 'update', 'delete', 'add'].includes(prop)) {
                    return async (...args) => {
                        const key = 'write:' + target.path;
                        pending++; render();
                        try {
                            const result = await value.apply(target, args);
                            failures.delete(key); saved = true;
                            return result;
                        } catch (error) { failures.add(key); throw error; }
                        finally { pending--; render(); }
                    };
                }
                if (prop === 'onSnapshot') return (...args) => {
                    // Existing callers use the next/error callback signature.
                    const [next, error] = args;
                    const key = 'read:' + target.path;
                    const unsubscribe = value.call(target, { includeMetadataChanges: true }, snapshot => {
                        received = true;
                        cachedSources.set(key, !!snapshot.metadata?.fromCache);
                        failures.delete(key); render();
                        next(snapshot);
                    }, err => {
                        failures.add(key); render();
                        if (error) error(err);
                    });
                    return () => { unsubscribe(); cachedSources.delete(key); failures.delete(key); render(); };
                };
                if (prop === 'get') return async (...args) => {
                    const key = 'read:' + target.path;
                    try {
                        const snapshot = await value.apply(target, args);
                        received = true; failures.delete(key);
                        cachedSources.set(key, !!snapshot.metadata?.fromCache); render();
                        return snapshot;
                    } catch (error) { failures.add(key); render(); throw error; }
                };
                return value.bind(target);
            },
        });
        wrapped.set(ref, proxy);
        return proxy;
    }
    window.syncStatus = { wrap, status };
    document.addEventListener('DOMContentLoaded', () => {
        const text = document.createElement('span');
        text.id = 'cloud-sync-status';
        text.setAttribute('role', 'status');
        text.style.display = 'none';
        document.body.append(text);
        render();
    });
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    window.addEventListener('beforeunload', event => {
        if (pending || [...failures].some(key => key.startsWith('write:'))) {
            event.preventDefault(); event.returnValue = '';
        }
    });
})();
