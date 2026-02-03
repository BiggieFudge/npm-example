# main.py
import yaml

data = """
!!python/object/apply:os.system
args: ['echo vulnerable!']
"""

def process_yaml(yaml_string):
    # TRIGGER: yaml.load with the default Loader (or UnsafeLoader) is the CVE trigger
    # The scanner looks for this specific function call.
    return yaml.load(yaml_string, Loader=yaml.Loader)

if __name__ == "__main__":
    process_yaml(data)
    print("Python analysis ran.")
