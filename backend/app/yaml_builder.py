import yaml


class NoAliasDumper(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True


def build_script_yaml(script: dict) -> str:
    return yaml.dump(script, Dumper=NoAliasDumper, allow_unicode=True, sort_keys=False)
