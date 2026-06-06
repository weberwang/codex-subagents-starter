from __future__ import annotations

"""校验 Owen 插件源码是否满足最小安装与运行基线。"""

import argparse
import json
import re
from pathlib import Path

JsonScalar = str | int | float | bool | None
JsonValue = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]
JsonObject = dict[str, JsonValue]

WINDOWS_ABSOLUTE_PATH_PATTERN = re.compile(r"(?<![\w./-])[A-Za-z]:[\\/][^\s`'\"<>)\]]+")
WINDOWS_MARKDOWN_PATH_PATTERN = re.compile(r"(?<![\w.-])/[A-Za-z]:/[^\s`'\"<>)\]]+")
UNC_ABSOLUTE_PATH_PATTERN = re.compile(r"(?<![\w./-])\\\\[^\\/\s]+\\[^\\/\s]+")
POSIX_ABSOLUTE_PATH_PATTERN = re.compile(
    r"(?<![\w.-])/(Users|home|var|etc|tmp|opt|srv|mnt|media|private)/[^\s`'\"<>)\]]+",
)


def parse_args() -> argparse.Namespace:
    """解析命令行参数，允许仓库包装器显式指定待校验的插件根目录。"""
    parser = argparse.ArgumentParser(description="校验 Owen 插件源码结构。")
    parser.add_argument(
        "--plugin-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="待校验的 Owen 插件根目录。",
    )
    return parser.parse_args()


def assert_exists(target_path: Path) -> None:
    """校验目标路径存在，缺失时抛出显式错误。"""
    if not target_path.exists():
        raise FileNotFoundError(f"missing required path: {target_path}")


def load_json_document(document_path: Path) -> JsonValue:
    """读取 JSON 文档并确保其可解析。"""
    return json.loads(document_path.read_text(encoding="utf8"))


def load_json_object(document_path: Path) -> JsonObject:
    """读取 JSON 对象文档，避免后续字段检查落到非对象结构上。"""
    document = load_json_document(document_path)
    if not isinstance(document, dict):
        raise ValueError(f"JSON document must be an object: {document_path}")
    return document


def assert_required_paths(root: Path) -> None:
    """校验插件清单、入口 skill 与运行资产目录的最小存在性。"""
    required_paths = (
        root / ".codex-plugin" / "plugin.json",
        root / "README.md",
        root / "skills" / "orchestrator" / "SKILL.md",
        root / "assets" / "agents" / "oracle.toml",
        root / "assets" / "agents" / "librarian.toml",
        root / "assets" / "agents" / "implementer.toml",
        root / "assets" / "agents" / "momus.toml",
        root / "assets" / "templates" / "orchestration-plan-template.md",
        root / "assets" / "templates" / "orchestration-ledger-template.json",
        root / "assets" / "docs" / "codex-agent-orchestration.md",
    )

    for required_path in required_paths:
        assert_exists(required_path)


def assert_manifest(manifest_path: Path) -> None:
    """校验 plugin.json 的稳定字段，防止入口插件退化成无效骨架。"""
    manifest = load_json_object(manifest_path)
    required_interface_fields = (
        "displayName",
        "shortDescription",
        "longDescription",
        "developerName",
        "category",
        "capabilities",
        "defaultPrompt",
        "brandColor",
    )

    if manifest.get("name") != "owen":
        raise ValueError("plugin name must be owen")
    if manifest.get("skills") != "./skills/":
        raise ValueError("plugin skills path must be ./skills/")
    if "hooks" in manifest:
        raise ValueError("plugin.json must not declare hooks")

    interface = manifest.get("interface")
    if not isinstance(interface, dict):
        raise ValueError("plugin.json interface must be an object")

    for field_name in required_interface_fields:
        if field_name not in interface:
            raise ValueError(f"plugin.json interface missing field: {field_name}")

    capabilities = interface["capabilities"]
    default_prompt = interface["defaultPrompt"]
    if not isinstance(capabilities, list) or len(capabilities) == 0:
        raise ValueError("plugin.json interface.capabilities must be a non-empty array")
    if not isinstance(default_prompt, list) or len(default_prompt) == 0:
        raise ValueError("plugin.json interface.defaultPrompt must be a non-empty array")


def assert_json_documents_parse(root: Path) -> None:
    """递归解析插件内全部 JSON 文档，尽早发现模板或清单损坏。"""
    for json_path in root.rglob("*.json"):
        load_json_document(json_path)


def assert_assets_do_not_use_absolute_paths(assets_root: Path) -> None:
    """扫描 assets 文本文件，阻止把开发机绝对路径带进可安装插件。"""
    absolute_path_patterns = (
        WINDOWS_ABSOLUTE_PATH_PATTERN,
        WINDOWS_MARKDOWN_PATH_PATTERN,
        UNC_ABSOLUTE_PATH_PATTERN,
        POSIX_ABSOLUTE_PATH_PATTERN,
    )

    for asset_path in assets_root.rglob("*"):
        if not asset_path.is_file():
            continue

        content = asset_path.read_text(encoding="utf8")
        for pattern in absolute_path_patterns:
            match = pattern.search(content)
            if match is not None:
                raise ValueError(f"asset contains absolute path: {asset_path}: {match.group(0)}")


def main() -> None:
    """执行插件级最小校验，并输出稳定结果摘要。"""
    args = parse_args()
    root = Path(args.plugin_root).resolve()

    assert_required_paths(root)
    assert_manifest(root / ".codex-plugin" / "plugin.json")
    assert_json_documents_parse(root)
    assert_assets_do_not_use_absolute_paths(root / "assets")

    print("Owen plugin is valid.")


if __name__ == "__main__":
    main()
