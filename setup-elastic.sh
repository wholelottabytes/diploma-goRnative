#!/bin/sh
# Wait for Elasticsearch to be up
until curl -s http://elasticsearch:9200; do
  echo "Waiting for Elasticsearch..."
  sleep 5
done

# 1. Create ILM Policy
echo "Creating ILM policy..."
curl -X PUT "http://elasticsearch:9200/_ilm/policy/log-cleanup-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "5GB",
            "max_age": "1d"
          }
        }
      },
      "delete": {
        "min_age": "7d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
'

# 2. Create Index Template to apply ILM policy
echo "Creating index template..."
curl -X PUT "http://elasticsearch:9200/_index_template/filebeat_template" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["filebeat-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "log-cleanup-policy",
      "index.lifecycle.rollover_alias": "filebeat"
    }
  }
}
'
echo "Elasticsearch setup complete."
