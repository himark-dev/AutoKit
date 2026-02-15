package tech.autokit;

interface IPlugin {
    Map     discover();
    String  execute(String type, String config);
}
