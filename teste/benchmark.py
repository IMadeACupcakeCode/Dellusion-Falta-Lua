#!/usr/bin/env python3
"""
Benchmark de proxies SOCKS5 a partir da lista do proxifly/free-proxy-list.

Uso:
    pip install requests[socks]
    python benchmark_proxies.py

Baixa a lista, testa cada proxy fazendo uma requisição real através dele,
mede a latência e salva um CSV ordenado do mais rápido pro mais lento.
"""

import requests
import time
import csv
from concurrent.futures import ThreadPoolExecutor, as_completed

PROXY_LIST_URL = "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks5/data.txt"
TEST_URL = "https://httpbin.org/ip"   # endpoint leve que retorna o IP de saída
TIMEOUT = 6                            # segundos por tentativa
MAX_WORKERS = 50                       # threads simultâneas
OUTPUT_CSV = "proxies_benchmark.csv"


def fetch_proxy_list():
    r = requests.get(PROXY_LIST_URL, timeout=15)
    r.raise_for_status()
    lines = [l.strip() for l in r.text.splitlines() if l.strip()]
    return lines


def test_proxy(proxy_line):
    """proxy_line vem no formato socks5://ip:porta"""
    if not proxy_line.startswith("socks5://"):
        proxy_line = "socks5://" + proxy_line

    proxies = {"http": proxy_line, "https": proxy_line}
    start = time.perf_counter()
    try:
        resp = requests.get(TEST_URL, proxies=proxies, timeout=TIMEOUT)
        elapsed = round((time.perf_counter() - start) * 1000, 1)  # ms
        if resp.status_code == 200:
            return {"proxy": proxy_line, "status": "OK", "latency_ms": elapsed, "ip_retornado": resp.json().get("origin", "")}
        return {"proxy": proxy_line, "status": f"HTTP {resp.status_code}", "latency_ms": elapsed, "ip_retornado": ""}
    except Exception as e:
        return {"proxy": proxy_line, "status": f"FALHA ({type(e).__name__})", "latency_ms": None, "ip_retornado": ""}


def main():
    print("Baixando lista de proxies...")
    proxy_lines = fetch_proxy_list()
    print(f"{len(proxy_lines)} proxies encontrados. Testando com {MAX_WORKERS} threads...\n")

    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(test_proxy, p): p for p in proxy_lines}
        done = 0
        for fut in as_completed(futures):
            done += 1
            r = fut.result()
            results.append(r)
            status_symbol = "✓" if r["status"] == "OK" else "✗"
            print(f"[{done}/{len(proxy_lines)}] {status_symbol} {r['proxy']:<28} {r['status']:<20} {r['latency_ms'] or ''}")

    working = [r for r in results if r["status"] == "OK"]
    working.sort(key=lambda x: x["latency_ms"])

    print(f"\n{len(working)}/{len(proxy_lines)} proxies funcionando.")
    if working:
        print("\nTop 10 mais rápidos:")
        for r in working[:10]:
            print(f"  {r['latency_ms']:>7.1f} ms  {r['proxy']}  -> {r['ip_retornado']}")

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["proxy", "status", "latency_ms", "ip_retornado"])
        writer.writeheader()
        writer.writerows(sorted(results, key=lambda x: (x["latency_ms"] is None, x["latency_ms"])))

    print(f"\nResultado completo salvo em {OUTPUT_CSV}")


if __name__ == "__main__":
    main()