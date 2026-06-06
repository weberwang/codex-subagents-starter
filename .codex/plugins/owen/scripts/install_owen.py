from __future__ import annotations

"""将 Owen 插件源码导出到目标 Codex 用户目录。"""

import argparse
import json
import shutil
from pathlib import Path

JsonScalar = str | int | float | bool | None
JsonValue = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]
JsonObject = dict[str, JsonValue]


def parse_args() -> argparse.Namespace:
    """解析命令行参数，允许测试把用户目录重定向到临时目录。"""
    parser = argparse.ArgumentParser(description="将 Owen 插件导出到目标 Codex 用户目录。")
    parser.add_argument(
        "--home-root",
        default=str(Path.home()),
        help="目标用户主目录，安装后会写入 <home-root>/plugins/owen 和 <home-root>/.agents/plugins/marketplace.json。",
    )
    return parser.parse_args()


def plugin_root() -> Path:
    """返回仓库中的 Owen 插件源码根目录。"""
    return Path(__file__).resolve().parents[1]


def default_marketplace() -> JsonObject:
    """返回个人 marketplace 的最小默认结构，便于首次安装直接落盘。"""
    return {
        "name": "personal",
        "interface": {
            "displayName": "Personal",
        },
        "plugins": [],
    }


def owen_marketplace_entry() -> JsonObject:
    """返回 Owen 的 marketplace 条目，统一约束本地插件的来源和安装策略。"""
    return {
        "name": "owen",
        "source": {
            "source": "local",
            "path": "./plugins/owen",
        },
        "policy": {
            "installation": "AVAILABLE",
            "authentication": "ON_INSTALL",
        },
        "category": "Productivity",
    }


def load_json_object(document_path: Path) -> JsonObject:
    """读取 JSON 对象文档，并在结构错误时给出显式异常。"""
    document = json.loads(document_path.read_text(encoding="utf8"))
    if not isinstance(document, dict):
        raise ValueError(f"JSON document must be an object: {document_path}")
    return document


def load_marketplace(target_marketplace: Path) -> JsonObject:
    """读取已有 marketplace，不存在时返回个人 marketplace 默认结构。"""
    if not target_marketplace.exists():
        return default_marketplace()

    marketplace = load_json_object(target_marketplace)
    plugins = marketplace.get("plugins")
    if plugins is None:
        marketplace["plugins"] = []
        return marketplace
    if not isinstance(plugins, list):
        raise ValueError(f"marketplace.plugins must be a list: {target_marketplace}")
    return marketplace


def upsert_marketplace_plugin(marketplace: JsonObject, plugin_entry: JsonObject) -> JsonObject:
    """插入或替换 Owen 条目，同时保留其他已有插件。"""
    raw_plugins = marketplace.get("plugins", [])
    if not isinstance(raw_plugins, list):
        raise ValueError("marketplace.plugins must be a list")

    filtered_plugins: list[JsonValue] = []
    for raw_plugin in raw_plugins:
        if not isinstance(raw_plugin, dict):
            raise ValueError("marketplace plugin entries must be JSON objects")
        if raw_plugin.get("name") == plugin_entry["name"]:
            continue
        filtered_plugins.append(raw_plugin)

    filtered_plugins.append(plugin_entry)
    marketplace["plugins"] = filtered_plugins
    return marketplace


def reset_target_directory(target_directory: Path) -> None:
    """清理旧的插件导出目录，避免旧文件残留污染新安装结果。"""
    if target_directory.is_dir():
        shutil.rmtree(target_directory)
        return
    if target_directory.exists():
        raise NotADirectoryError(f"target plugin path is not a directory: {target_directory}")


def install_plugin(source_root: Path, home_root: Path) -> tuple[Path, Path]:
    """复制插件源码并写入个人 marketplace，让 Codex 能从用户目录发现 Owen。"""
    target_plugin_root = home_root / "plugins" / "owen"
    target_marketplace = home_root / ".agents" / "plugins" / "marketplace.json"

    if not source_root.is_dir():
        raise FileNotFoundError(f"missing Owen plugin source: {source_root}")

    reset_target_directory(target_plugin_root)
    target_plugin_root.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(
        source_root,
        target_plugin_root,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )

    target_marketplace.parent.mkdir(parents=True, exist_ok=True)
    marketplace = load_marketplace(target_marketplace)
    updated_marketplace = upsert_marketplace_plugin(marketplace, owen_marketplace_entry())
    target_marketplace.write_text(
        json.dumps(updated_marketplace, ensure_ascii=False, indent=2) + "\n",
        encoding="utf8",
    )
    return target_plugin_root, target_marketplace


def main() -> None:
    """执行插件导出并输出结果摘要。"""
    args = parse_args()
    home_root = Path(args.home_root).resolve()
    target_plugin_root, target_marketplace = install_plugin(plugin_root(), home_root)
    print(f"Owen plugin exported to {target_plugin_root}")
    print(f"Owen marketplace updated at {target_marketplace}")


if __name__ == "__main__":
    main()
