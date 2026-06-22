from __future__ import annotations

import threading
import uuid
from typing import Dict, List, Optional

from .models import Contract

# In-memory, multi-tenant store for the demo.
#
# Every record is keyed by tenant_id so the schema is multi-tenant from day one;
# the demo just uses a single default tenant. Swapping this for Postgres later is
# a matter of reimplementing this interface against SQLAlchemy models with the
# same tenant_id column — no call-site changes.


class ContractStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        # tenant_id -> {contract_id -> Contract}
        self._by_tenant: Dict[str, Dict[str, Contract]] = {}

    def _tenant_bucket(self, tenant_id: str) -> Dict[str, Contract]:
        return self._by_tenant.setdefault(tenant_id, {})

    def create(self, contract: Contract) -> Contract:
        with self._lock:
            self._tenant_bucket(contract.tenant_id)[contract.contract_id] = contract
            return contract

    def get(self, tenant_id: str, contract_id: str) -> Optional[Contract]:
        with self._lock:
            return self._tenant_bucket(tenant_id).get(contract_id)

    def save(self, contract: Contract) -> Contract:
        with self._lock:
            self._tenant_bucket(contract.tenant_id)[contract.contract_id] = contract
            return contract

    def list(self, tenant_id: str) -> List[Contract]:
        with self._lock:
            return list(self._tenant_bucket(tenant_id).values())

    @staticmethod
    def new_id() -> str:
        return uuid.uuid4().hex[:12]


# Module-level singleton for the demo process.
store = ContractStore()
